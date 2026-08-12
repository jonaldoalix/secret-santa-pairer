import { buildNotifyBody } from "../../../shared/message.js";
import type { DeliveryRecord } from "../../../shared/types.js";
import type { Notifier, NotifyContext } from "./types.js";
import { destinationFor } from "./types.js";

export const stubNotifier: Notifier = {
  id: "stub",
  async sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]> {
    return ctx.assignments.map((assignment) => {
      const body = buildNotifyBody({
        santaName: assignment.santa.name,
        recipientName: assignment.recipient.name,
        budget: ctx.config.giftBudget,
        eventDate: ctx.config.eventDate,
        eventLabel: ctx.config.eventLabel,
        messages: ctx.config.messages,
      });
      const to = destinationFor(assignment, "stub");
      return {
        santaId: assignment.santa.id,
        santaName: assignment.santa.name,
        channel: "stub",
        to,
        body,
        status: "stubbed" as const,
      };
    });
  },
};
