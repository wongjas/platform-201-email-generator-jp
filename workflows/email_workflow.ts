import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { EmailListenerFunction } from "../functions/email_listener_function.ts";

const EmailWorkflow = DefineWorkflow({
  callback_id: "email_workflow",
  title: "Email workflow",
  description: "Workflow listens for emails and creates responses to them",
  input_parameters: {
    properties: {
      message_ts: {
        type: Schema.types.string,
      },
      channel_id: {
        type: Schema.types.string,
      },
    },
    required: ["message_ts", "channel_id"],
  },
});

EmailWorkflow.addStep(EmailListenerFunction, {
  message_ts: EmailWorkflow.inputs.message_ts,
  channel_id: EmailWorkflow.inputs.channel_id,
});

export default EmailWorkflow;
