import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("accepts 10 digits and common formats", () => {
    expect(normalizePhone("2813308004")).toBe("2813308004");
    expect(normalizePhone("(281) 330-8004")).toBe("2813308004");
    expect(normalizePhone("281-330-8004")).toBe("2813308004");
    expect(normalizePhone("+1 281 330 8004")).toBe("2813308004");
  });

  it("rejects short numbers", () => {
    expect(normalizePhone("5550100")).toBeUndefined();
    expect(normalizePhone("1234567")).toBeUndefined();
  });
});

describe("formatPhoneDisplay", () => {
  it("formats NANP and passes through other lengths", () => {
    expect(formatPhoneDisplay("2813308004")).toBe("(281) 330-8004");
    expect(formatPhoneDisplay("123")).toBe("123");
  });
});
