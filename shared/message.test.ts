import { describe, expect, it } from "vitest";
import { buildNotifyBody, DEFAULT_MESSAGES } from "./message.js";

describe("buildNotifyBody", () => {
  const base = {
    santaName: "Alex",
    recipientName: "Bailey",
    budget: "$25",
    eventDate: "Dec 24",
    eventLabel: "Secret Santa",
  };

  it("joins every language block", () => {
    const body = buildNotifyBody({ ...base, messages: DEFAULT_MESSAGES });
    expect(body).toContain("Alex");
    expect(body).toContain("Bailey");
    expect(body).toContain("¡Hola");
  });

  it("supports any custom language set", () => {
    const body = buildNotifyBody({
      ...base,
      messages: [
        { label: "Português", body: "Olá {santa}! Seu amigo oculto é {recipient}." },
        { label: "Français", body: "Bonjour {santa}! Ton secret santa est {recipient}." },
      ],
    });
    expect(body).toBe(
      "Olá Alex! Seu amigo oculto é Bailey.\n\nBonjour Alex! Ton secret santa est Bailey.",
    );
  });

  it("allows a single language only", () => {
    const body = buildNotifyBody({
      ...base,
      messages: [{ label: "Deutsch", body: "Hallo {santa}, dein Partner ist {recipient}." }],
    });
    expect(body).toBe("Hallo Alex, dein Partner ist Bailey.");
  });
});
