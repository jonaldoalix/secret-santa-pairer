export type NotifyProviderId =
  | "stub"
  | "twilio"
  | "smtp"
  | "aws_sns"
  | "http_sms";

export type ContactMode = "phone" | "email" | "either";

export interface MessageBlock {
  id: string;
  /** Host-facing label (English, Español, …) — not included in the outbound text. */
  label: string;
  body: string;
}

export interface Participant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** Message block ids this person should receive. */
  languageIds: string[];
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
