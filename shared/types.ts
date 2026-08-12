export type NotifyProviderId =
  | "stub"
  | "twilio"
  | "smtp"
  | "aws_sns"
  | "http_sms";

export type ContactMode = "phone" | "email" | "either";

export interface MessageBlock {
  /** Host-facing label only (English, Español, Português, …) — not sent in the message. */
  label: string;
  body: string;
}

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
  messages: MessageBlock[];
  participantCount: number;
}

export interface EditableConfig {
  giftBudget: string;
  eventDate: string;
  eventLabel: string;
  messages: MessageBlock[];
}

export interface AssignResult {
  assignmentCount: number;
  deliveries: DeliveryRecord[];
  museumMode: boolean;
}
