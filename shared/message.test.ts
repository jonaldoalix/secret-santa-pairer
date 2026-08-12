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
  });

  it("sends only selected languages", () => {
    const body = buildNotifyBody({ ...base, languageIds: ["es"] });
    expect(body).toContain("¡Hola");
    expect(body).not.toContain("Hello");
  });

  it("supports custom language ids", () => {
    const body = buildNotifyBody({
      ...base,
      messages: [
        { id: "pt", label: "Português", body: "Olá {santa}! Amigo: {recipient}." },
        { id: "fr", label: "Français", body: "Bonjour {santa}! Cible: {recipient}." },
      ],
      languageIds: ["pt"],
    });
    expect(body).toBe("Olá Alex! Amigo: Bailey.");
  });
});
