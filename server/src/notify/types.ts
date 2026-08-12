import type { Assignment, DeliveryRecord, NotifyProviderId } from "../../../shared/types.js";
import type { AppConfig } from "../config.js";

export interface NotifyContext {
  config: AppConfig;
  assignments: Assignment[];
}

export interface Notifier {
  id: NotifyProviderId;
  sendAll(ctx: NotifyContext): Promise<DeliveryRecord[]>;
}

export function destinationFor(
  assignment: Assignment,
  provider: NotifyProviderId,
): string {
  const { santa } = assignment;
  if (provider === "smtp") {
    if (!santa.email) throw new Error(`${santa.name} is missing an email.`);
    return santa.email;
  }
  if (provider === "stub") {
    return santa.phone || santa.email || "unknown";
  }
  if (!santa.phone) throw new Error(`${santa.name} is missing a phone number.`);
  return santa.phone;
}
