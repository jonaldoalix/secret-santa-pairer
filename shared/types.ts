export type NotifyProviderId =
  | "stub"
  | "twilio"
  | "smtp"
  | "aws_sns"
  | "http_sms";

export type MessageLocale = "en" | "es" | "bilingual";

export type ContactMode = "phone" | "email" | "either";

export interface Participant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Assignment {
  santa: Participant;
  recipient: Participant;
}

export interface DeliveryRecord {
  santaId: string;
  santaName: string;
  channel: NotifyProviderId;
  to: string;
  body: string;
  status: "queued" | "sent" | "stubbed" | "failed";
  error?: string;
}

export interface PublicConfig {
  museumMode: boolean;
  notifyProvider: NotifyProviderId;
  contactMode: ContactMode;
  giftBudget: string;
  eventDate: string;
  eventLabel: string;
  messageLocale: MessageLocale;
  participantCount: number;
}

export interface AssignResult {
  assignmentCount: number;
  deliveries: DeliveryRecord[];
  museumMode: boolean;
}
