import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ListenerDefinition } from "../functions/thread_listener_function.ts";

const ThreadWorkflow = DefineWorkflow({
  callback_id: "thread_workflow",
  title: "Thread workflow",
  description:
    "A workflow that listens for messages on a thread and responds with AI.",
  input_parameters: {
    properties: {
      thread_ts: {
        type: Schema.types.string,
      },
      channel_id: {
        type: Schema.types.string,
      },
      bot_id: {
        type: Schema.types.string,
      },
    },
    required: ["thread_ts", "channel_id", "bot_id"],
  },
});

ThreadWorkflow.addStep(ListenerDefinition, {
  thread_ts: ThreadWorkflow.inputs.thread_ts,
  channel_id: ThreadWorkflow.inputs.channel_id,
  bot_id: ThreadWorkflow.inputs.bot_id,
});

export default ThreadWorkflow;
