import type { NotifyProviderId } from "../../../shared/types.js";
import { awsSnsNotifier } from "./awsSns.js";
import { httpSmsNotifier } from "./httpSms.js";
import { smtpNotifier } from "./smtp.js";
import { stubNotifier } from "./stub.js";
import { twilioNotifier } from "./twilio.js";
import type { Notifier } from "./types.js";

const registry: Record<NotifyProviderId, Notifier> = {
  stub: stubNotifier,
  twilio: twilioNotifier,
  smtp: smtpNotifier,
  aws_sns: awsSnsNotifier,
  http_sms: httpSmsNotifier,
};

export function getNotifier(provider: NotifyProviderId): Notifier {
  return registry[provider];
}
