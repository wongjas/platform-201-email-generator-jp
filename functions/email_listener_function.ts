import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import OpenAI from 'https://deno.land/x/openai@v4.19.1/mod.ts';
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import ThreadWorkflow from "../workflows/thread_workflow.ts";

export const EmailListenerFunction = DefineFunction({
  callback_id: "email_listener_function",
  title: "Email Listener Function",
  description:
    "A function that listens for email on a particular channel and uses AI to generate a response",
  source_file: "functions/email_listener_function.ts",
  input_parameters: {
    properties: {
      message_ts: {
        type: Schema.types.string,
        description: "The timestamp of the email message.",
      },
      channel_id: {
        type: Schema.types.string,
        description: "The channel that the email was posted.",
      },
    },
    required: ["message_ts", "channel_id"],
  },
});

export default SlackFunction(
  EmailListenerFunction,
  async ({ client, inputs, env }) => {
    // 1. Send a message in thread to the e-mail message,
    //    confirming that the AI model is "thinking"
    const ackResponse = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.message_ts,
      text:
        "考え中です。少々お待ちください！ :hourglass_flowing_sand:",
    });

    if (!ackResponse.ok) {
      console.error(ackResponse.error);
    }

    // 2. Send email contents to AI model and generate a response for us
    // Since the event doesn't contain the file itself, must call
    // `conversations.history` to get that info
    const historyResponse = await client.conversations.history({
      channel: inputs.channel_id,
      oldest: inputs.message_ts,
      inclusive: true,
      limit: 1,
    });

    if (!historyResponse.ok) {
      console.error(historyResponse.error);
    }

    const email_text = historyResponse.messages[0].files[0].plain_text;

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    }
    );

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          "role": "system",
          "content":
            `You are a helpful assistant. Please write a short response to the following email:`,
        },
        { "role": "user", "content": `${email_text}` },
      ],
      model: "gpt-3.5-turbo",
    });

    const completionContent = chatCompletion.choices[0].message.content;

    // 3. Update the "thinking" message to the AI model's response
    const updateResponse = await client.chat.update({
      channel: inputs.channel_id,
      ts: ackResponse.ts,
      text: `${completionContent}`,
      mrkdwn: true,
    });

    if (!updateResponse.ok) {
      console.log(updateResponse.error);
    }

    // 4. Create trigger to listen for new messages on the email message thread
    const authResponse = await client.auth.test();
    const botId = authResponse.user_id;

    const triggerResponse = await client.workflows.triggers.create({
      type: TriggerTypes.Event,
      name: `Thread Listener response for ts: ${inputs.message_ts}`,
      description: "Listens on the thread for the message in the name",
      workflow: `#/workflows/${ThreadWorkflow.definition.callback_id}`,
      event: {
        event_type: TriggerEventTypes.MessagePosted,
        channel_ids: [`${inputs.channel_id}`],
        filter: {
          version: 1,
          root: {
            operator: "AND",
            inputs: [{
              statement: `{{data.thread_ts}} == ${inputs.message_ts}`,
            }, {
              operator: "NOT",
              inputs: [{
                statement: `{{data.user_id}} == ${botId}`,
              }],
            }],
          },
        },
      },
      inputs: {
        thread_ts: {
          value: inputs.message_ts,
        },
        channel_id: {
          value: "{{data.channel_id}}",
        },
        bot_id: {
          value: botId,
        },
      },
    });

    if (!triggerResponse.ok) {
      console.error(triggerResponse.error);
    }

    return {
      outputs: {},
    };
  },
);
