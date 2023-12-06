import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import OpenAI from 'https://deno.land/x/openai@v4.19.1/mod.ts';
import { ChatCompletionMessageParam } from "https://deno.land/x/openai@v4.19.1/resources/mod.ts";


export const ListenerDefinition = DefineFunction({
  callback_id: "listener_function",
  title: "listener text using AI",
  description:
    "A function that listens on a thread, pulls in the contents and uses AI to respond.",
  source_file: "functions/thread_listener_function.ts",
  input_parameters: {
    properties: {
      bot_id: {
        type: Schema.types.string,
        description: "User ID of the bot",
      },
      thread_ts: {
        type: Schema.types.string,
        description: "The thread timestamp",
      },
      channel_id: {
        type: Schema.types.string,
        description: "The channel Id",
      },
    },
    required: ["thread_ts", "channel_id", "bot_id"],
  },
});

export default SlackFunction(
  ListenerDefinition,
  async ({ client, inputs, env }) => {
    // 1. Acknowledge user input and response with "thinking" message
    const ackResponse = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_ts,
      text:
        "考え中です。少々お待ちください！ :hourglass_flowing_sand:",
    });
    console.log(ackResponse);

    if (!ackResponse.ok) {
      console.error(ackResponse.error);
    }

    // 2. Get message contents by pulling in all conversations in the thread
    //    and feed contents to AI model
    const conversationResponse = await client.conversations.replies({
      channel: inputs.channel_id,
      ts: inputs.thread_ts,
    });

    if (!conversationResponse.ok) {
      console.error(conversationResponse.error);
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
  });

    let messages: ChatCompletionMessageParam[] = [
      {
        "role": "system",
        "content": `You are a helpful assistant.`,
      },
    ];

    for (let i = 1; i < conversationResponse.messages.length; i++) { // Start at 1, the first message is the file
      if (conversationResponse.messages[i] != inputs.bot_id) {
        messages.push({
          "role": "user",
          "content": `${conversationResponse.messages[i].text}`,
        });
      } else {
        messages.push({
          "role": "assistant",
          "content": `${conversationResponse.messages[i].text}`,
        });
      }
    }

    const chatCompletion = await openai.chat.completions.create({
      messages: messages,
      model: "gpt-3.5-turbo",
    });

    // 3. Update "thinking" message with AI model contents
    const completionContent = chatCompletion.choices[0].message.content;

    const updateResponse = await client.chat.update({
      channel: inputs.channel_id,
      ts: ackResponse.ts,
      text: `${completionContent}`,
      mrkdwn: true,
    });

    if (!updateResponse.ok) {
      console.log(updateResponse.error);
    }

    return {
      outputs: {},
    };
  },
);
