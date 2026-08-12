export type NotifyProviderId =
  | "stub"
  | "twilio"
  | "smtp"
  | "aws_sns"
  | "http_sms";

export type ContactMode = "phone" | "email" | "either";

export interface MessageBlock {
  id: string;
  /** Host-facing label (English, Espanol, ...) - not included in the outbound text. */
  label: string;
  body: string;
}

export type DeliveryMode = "reveal" | "send";

export interface Participant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** Message block ids this person should receive. */
  languageIds: string[];
  /** How this person learns their pairing. */
  deliveryMode: DeliveryMode;
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
  revealCount: number;
  sentCount: number;
  failedCount: number;
  revealReady: boolean;
  museumMode: boolean;
}

export interface RevealStatus {
  active: boolean;
  complete: boolean;
  index: number;
  total: number;
  santaName: string | null;
  santaId: string | null;
}

export interface RevealPeek {
  recipientName: string;
}
