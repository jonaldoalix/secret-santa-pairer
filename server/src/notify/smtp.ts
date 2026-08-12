import nodemailer from "nodemailer";
import { buildNotifyBody } from "../../../shared/message.js";
import type { DeliveryRecord } from "../../../shared/types.js";
import type { Notifier, NotifyContext } from "./types.js";
import { destinationFor } from "./types.js";

export const smtpNotifier: Notifier = {
  id: "smtp",
  async sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]> {
    const transporter = nodemailer.createTransport({
      host: ctx.config.smtp.host,
      port: ctx.config.smtp.port,
      secure: ctx.config.smtp.secure,
      auth:
        ctx.config.smtp.user || ctx.config.smtp.pass
          ? { user: ctx.config.smtp.user, pass: ctx.config.smtp.pass }
          : undefined,
    });

    const deliveries: DeliveryRecord[] = [];

    for (const assignment of ctx.assignments) {
      const body = buildNotifyBody({
        santaName: assignment.santa.name,
        recipientName: assignment.recipient.name,
        budget: ctx.config.giftBudget,
        eventDate: ctx.config.eventDate,
        eventLabel: ctx.config.eventLabel,
        messages: ctx.config.messages,
      });
      const to = destinationFor(assignment, "smtp");

      try {
        await transporter.sendMail({
          from: ctx.config.smtp.from,
          to,
          subject: `${ctx.config.eventLabel}: your recipient`,
          text: body,
        });
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "smtp",
          to,
          body,
          status: "sent",
        });
      } catch (error) {
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "smtp",
          to,
          body,
          status: "failed",
          error: error instanceof Error ? error.message : "SMTP send failed",
        });
      }
    }

    return deliveries;
  },
};
