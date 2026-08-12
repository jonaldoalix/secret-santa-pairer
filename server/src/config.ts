import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { DEFAULT_MESSAGES } from "../../shared/message.js";
import type {
  ContactMode,
  MessageBlock,
  NotifyProviderId,
} from "../../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

export { findRoot };

const rootDir = findRoot(path.resolve(__dirname));

dotenv.config({ path: path.join(rootDir, ".env") });

const providerSchema = z.enum([
  "stub",
  "twilio",
  "smtp",
  "aws_sns",
  "http_sms",
]);

function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function contactModeFor(provider: NotifyProviderId): ContactMode {
  if (provider === "smtp") return "email";
  if (provider === "stub") return "either";
  return "phone";
}

function seedMessages(): MessageBlock[] {
  const fromJson = process.env.MESSAGE_TEMPLATES_JSON?.trim();
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson) as MessageBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m, i) => ({
          id: String(m.id || `msg-${i + 1}`).slice(0, 64),
          label: String(m.label || "Message").slice(0, 40),
          body: String(m.body || ""),
        }));
      }
    } catch {
      // fall through
    }
  }

  const en = process.env.MESSAGE_TEMPLATE_EN?.trim();
  const es = process.env.MESSAGE_TEMPLATE_ES?.trim();
  if (en || es) {
    const blocks: MessageBlock[] = [];
    if (en) blocks.push({ id: "en", label: "English", body: en });
    if (es) blocks.push({ id: "es", label: "Español", body: es });
    return blocks;
  }

  return DEFAULT_MESSAGES.map((m) => ({ ...m }));
}

export interface AppConfig {
  port: number;
  museumMode: boolean;
  notifyProvider: NotifyProviderId;
  contactMode: ContactMode;
  giftBudget: string;
  eventDate: string;
  eventLabel: string;
  messages: MessageBlock[];
  seedMuseumDemo: boolean;
  twilio: {
    accountSid: string;
    authToken: string;
    from: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  awsSns: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    senderId?: string;
  };
  httpSms: {
    url: string;
    apiKey: string;
    authHeader: string;
  };
  rootDir: string;
  clientDist: string;
}

export function loadConfig(): AppConfig {
  const museumMode = boolEnv(process.env.MUSEUM_MODE, false);
  const requested = providerSchema.parse(process.env.NOTIFY_PROVIDER || "stub");
  // Public demos must never accidentally wire a live provider.
  const notifyProvider: NotifyProviderId = museumMode ? "stub" : requested;

  return {
    port: Number(process.env.PORT || 3024),
    museumMode,
    notifyProvider,
    contactMode: contactModeFor(notifyProvider),
    giftBudget: process.env.GIFT_BUDGET || "$25",
    eventDate: process.env.EVENT_DATE || "the 24th",
    eventLabel: process.env.EVENT_LABEL || "Secret Santa",
    messages: seedMessages(),
    seedMuseumDemo: boolEnv(process.env.SEED_MUSEUM_DEMO, museumMode),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      from: process.env.TWILIO_PHONE_NUMBER || "",
    },
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 587),
      secure: boolEnv(process.env.SMTP_SECURE, false),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      from: process.env.SMTP_FROM || "",
    },
    awsSns: {
      region: process.env.AWS_REGION || process.env.AWS_SNS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      senderId: process.env.AWS_SNS_SENDER_ID || undefined,
    },
    httpSms: {
      url: process.env.HTTP_SMS_URL || "",
      apiKey: process.env.HTTP_SMS_API_KEY || "",
      authHeader: process.env.HTTP_SMS_AUTH_HEADER || "Authorization",
    },
    rootDir,
    clientDist: path.join(rootDir, "dist/client"),
  };
}

export function assertProviderReady(config: AppConfig): void {
  if (config.museumMode || config.notifyProvider === "stub") return;

  switch (config.notifyProvider) {
    case "twilio":
      if (
        !config.twilio.accountSid ||
        !config.twilio.authToken ||
        !config.twilio.from
      ) {
        throw new Error(
          "Twilio provider selected but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER are incomplete.",
        );
      }
      break;
    case "smtp":
      if (!config.smtp.host || !config.smtp.from) {
        throw new Error(
          "SMTP provider selected but SMTP_HOST / SMTP_FROM are incomplete.",
        );
      }
      break;
    case "aws_sns":
      if (!config.awsSns.accessKeyId || !config.awsSns.secretAccessKey) {
        throw new Error(
          "AWS SNS provider selected but AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are incomplete.",
        );
      }
      break;
    case "http_sms":
      if (!config.httpSms.url) {
        throw new Error("HTTP SMS provider selected but HTTP_SMS_URL is empty.");
      }
      break;
    default:
      break;
  }
}
