import { describe, expect, it } from "vitest";
import { buildNotifyBody } from "./message.js";

describe("buildNotifyBody", () => {
  const base = {
    santaName: "Alex",
    recipientName: "Bailey",
    budget: "$25",
    eventDate: "Dec 24",
    eventLabel: "Secret Santa",
  };

  it("builds bilingual messages by default", () => {
    const body = buildNotifyBody({ ...base, locale: "bilingual" });
    expect(body).toContain("Alex");
    expect(body).toContain("Bailey");
    expect(body).toContain("¡Hola");
  });

  it("supports custom templates", () => {
    const body = buildNotifyBody({
      ...base,
      locale: "en",
      templateEn: "{santa} -> {recipient} ({budget})",
    });
    expect(body).toBe("Alex -> Bailey ($25)");
  });
});
