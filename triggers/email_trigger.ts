import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import EmailWorkflow from "../workflows/email_workflow.ts";

const emailTrigger: Trigger<typeof EmailWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "Email message trigger",
  description:
    "A email trigger, responds only to emails being sent via a channel email",
  workflow: `#/workflows/${EmailWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.MessagePosted,
    channel_ids: ["C0000000000"], // TODO: Must set this to an internal channel
    filter: {
      version: 1,
      root: {
        statement: "{{data.user_id}} == USLACKBOT", // Messages that come in via a channel e-mail have this as their user
      },
    },
  },
  inputs: {
    message_ts: {
      value: "{{data.message_ts}}",
    },
    channel_id: {
      value: "{{data.channel_id}}",
    },
  },
};

export default emailTrigger;
