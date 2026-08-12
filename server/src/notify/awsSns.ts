import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { buildNotifyBody } from "../../../shared/message.js";
import type { DeliveryRecord } from "../../../shared/types.js";
import type { Notifier, NotifyContext } from "./types.js";
import { destinationFor } from "./types.js";

export const awsSnsNotifier: Notifier = {
  id: "aws_sns",
  async sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]> {
    const client = new SNSClient({
      region: ctx.config.awsSns.region,
      credentials: {
        accessKeyId: ctx.config.awsSns.accessKeyId,
        secretAccessKey: ctx.config.awsSns.secretAccessKey,
      },
    });

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
      const to = destinationFor(assignment, "aws_sns");

      try {
        await client.send(
          new PublishCommand({
            PhoneNumber: to,
            Message: body,
            MessageAttributes: ctx.config.awsSns.senderId
              ? {
                  "AWS.SNS.SMS.SenderID": {
                    DataType: "String",
                    StringValue: ctx.config.awsSns.senderId,
                  },
                }
              : undefined,
          }),
        );
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "aws_sns",
          to,
          body,
          status: "sent",
        });
      } catch (error) {
        deliveries.push({
          santaId: assignment.santa.id,
          santaName: assignment.santa.name,
          channel: "aws_sns",
          to,
          body,
          status: "failed",
          error: error instanceof Error ? error.message : "AWS SNS send failed",
        });
      }
    }

    return deliveries;
  },
};
