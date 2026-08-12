import { buildNotifyBody } from "../../../shared/message.js";
import type { DeliveryRecord } from "../../../shared/types.js";
import type { Notifier, NotifyContext } from "./types.js";
import { destinationFor } from "./types.js";

export const httpSmsNotifier: Notifier = {
  id: "http_sms",
  async sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]> {
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
      const to = destinationFor(assignment, "http_sms");

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (ctx.config.httpSms.apiKey) {
          headers[ctx.config.httpSms.authHeader] =
            ctx.config.httpSms.authHeader.toLowerCase() === "authorization"
              ? `Bearer ${ctx.config.httpSms.apiKey}`
              : ctx.config.httpSms.apiKey;
        }

        const response = await fetch(ctx.config.httpSms.url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            to,
            body,
            santa: assignment.santa.name,
            recipient: assignment.recipient.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "http_sms",
          to,
          body,
          status: "sent",
        });
      } catch (error) {
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "http_sms",
          to,
          body,
          status: "failed",
          error: error instanceof Error ? error.message : "HTTP SMS send failed",
        });
      }
    }

    return deliveries;
  },
};
