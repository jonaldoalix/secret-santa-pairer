import twilio from "twilio";
import { buildNotifyBody } from "../../../shared/message.js";
import type { DeliveryRecord } from "../../../shared/types.js";
import type { Notifier, NotifyContext } from "./types.js";
import { destinationFor } from "./types.js";

export const twilioNotifier: Notifier = {
  id: "twilio",
  async sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]> {
    const client = twilio(ctx.config.twilio.accountSid, ctx.config.twilio.authToken);
    const deliveries: DeliveryRecord[] = [];

    for (const assignment of ctx.assignments) {
      const body = buildNotifyBody({
        santaName: assignment.santa.name,
        recipientName: assignment.recipient.name,
        budget: ctx.config.giftBudget,
        eventDate: ctx.config.eventDate,
        eventLabel: ctx.config.eventLabel,
        locale: ctx.config.messageLocale,
        templateEn: ctx.config.templateEn,
        templateEs: ctx.config.templateEs,
      });
      const to = destinationFor(assignment, "twilio");

      try {
        await client.messages.create({
          body,
          from: ctx.config.twilio.from,
          to,
        });
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "twilio",
          to,
          body,
          status: "sent",
        });
      } catch (error) {
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "twilio",
          to,
          body,
          status: "failed",
          error: error instanceof Error ? error.message : "Twilio send failed",
        });
      }
    }

    return deliveries;
  },
};
