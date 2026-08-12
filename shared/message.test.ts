import { describe, expect, it } from "vitest";
import { buildNotifyBody, DEFAULT_MESSAGES } from "./message.js";

describe("buildNotifyBody", () => {
  const base = {
    santaName: "Alex",
    recipientName: "Bailey",
    budget: "$25",
    eventDate: "Dec 24",
    eventLabel: "Secret Santa",
    messages: DEFAULT_MESSAGES,
  };

  it("joins every language when unrestricted", () => {
    const body = buildNotifyBody(base);
    expect(body).toContain("Alex");
    expect(body).toContain("¡Hola");
    expect(body).toContain("Dec 24");
  });

  it("falls back to default catalog when messages empty", () => {
    const body = buildNotifyBody({ ...base, messages: [] });
    expect(body).toContain("Hello");
  });

  it("sends only selected languages", () => {
    const body = buildNotifyBody({ ...base, languageIds: ["es"] });
    expect(body).toContain("¡Hola");
    expect(body).not.toContain("Hello");
  });

  it("supports custom language ids and event token", () => {
    const body = buildNotifyBody({
      ...base,
      messages: [
        {
          id: "pt",
          label: "Português",
          body: "Olá {santa}! Amigo: {recipient}. Event: {event}.",
        },
        { id: "fr", label: "Français", body: "Bonjour {santa}! Cible: {recipient}." },
        { id: "empty", label: "Empty", body: "   " },
      ],
      languageIds: ["pt", "empty"],
    });
    expect(body).toBe("Olá Alex! Amigo: Bailey. Event: Secret Santa.");
  });

  it("throws when no languages resolve", () => {
    expect(() =>
      buildNotifyBody({ ...base, languageIds: ["missing"] }),
    ).toThrow(/No message languages/);
  });
});
