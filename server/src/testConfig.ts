import type { AppConfig } from "../src/config.js";
import { DEFAULT_MESSAGES } from "../../shared/message.js";
import type { ContactMode, NotifyProviderId } from "../../shared/types.js";

function contactModeFor(provider: NotifyProviderId): ContactMode {
  if (provider === "smtp") return "email";
  if (provider === "stub") return "either";
  return "phone";
}

/** Minimal config for unit/API tests (stub notify, no museum seed). */
export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const museumMode = overrides.museumMode ?? false;
  const notifyProvider = museumMode
    ? "stub"
    : (overrides.notifyProvider ?? "stub");

  const base: AppConfig = {
    port: 3024,
    museumMode,
    notifyProvider,
    contactMode: contactModeFor(notifyProvider),
    giftBudget: "$25",
    eventDate: "Dec 24",
    eventLabel: "Secret Santa",
    messages: DEFAULT_MESSAGES.map((m) => ({ ...m })),
    seedMuseumDemo: false,
    twilio: { accountSid: "", authToken: "", from: "" },
    smtp: {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      from: "",
    },
    awsSns: {
      region: "us-east-1",
      accessKeyId: "",
      secretAccessKey: "",
    },
    httpSms: { url: "", apiKey: "", authHeader: "Authorization" },
    rootDir: process.cwd(),
    clientDist: "/tmp/secret-santa-pairer-missing-client-dist",
  };

  return {
    ...base,
    ...overrides,
    museumMode,
    notifyProvider,
    contactMode: overrides.contactMode ?? contactModeFor(notifyProvider),
  };
}
