import { describe, expect, it } from "vitest";
import { assignSecretSantas, isValidSecretSantaPerm } from "./pairing.js";
import type { Participant } from "./types.js";

function people(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `P${i}`,
    phone: `555000${String(i).padStart(4, "0")}`,
    languageIds: ["en"],
  }));
}

describe("isValidSecretSantaPerm", () => {
  it("rejects self and reciprocal pairs", () => {
    expect(isValidSecretSantaPerm([0, 1])).toBe(false);
    expect(isValidSecretSantaPerm([1, 0])).toBe(false);
    expect(isValidSecretSantaPerm([1, 2, 0])).toBe(true);
    expect(isValidSecretSantaPerm([1, 2, 3, 0])).toBe(true);
  });
});

describe("assignSecretSantas", () => {
  it("requires at least 3 people", () => {
    expect(() => assignSecretSantas(people(2))).toThrow(/at least 3/i);
  });

  it("works with an odd count", () => {
    const participants = people(5);
    const assignments = assignSecretSantas(participants, () => 0.42);
    expect(assignments).toHaveLength(5);
    const perm = assignments.map((a) =>
      participants.findIndex((p) => p.id === a.recipient.id),
    );
    expect(isValidSecretSantaPerm(perm)).toBe(true);
  });

  it("returns a valid pairing for even counts", () => {
    const participants = people(6);
    const assignments = assignSecretSantas(participants, () => 0.42);
    expect(assignments).toHaveLength(6);

    const perm = assignments.map((a) =>
      participants.findIndex((p) => p.id === a.recipient.id),
    );
    expect(isValidSecretSantaPerm(perm)).toBe(true);
  });
});
