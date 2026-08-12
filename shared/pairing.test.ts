import { describe, expect, it } from "vitest";
import { assignSecretSantas, isValidSecretSantaPerm } from "./pairing.js";
import type { Participant } from "./types.js";

function people(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `P${i}`,
    phone: `+1555000${i}`,
  }));
}

describe("isValidSecretSantaPerm", () => {
  it("rejects self and reciprocal pairs", () => {
    expect(isValidSecretSantaPerm([0, 1])).toBe(false);
    expect(isValidSecretSantaPerm([1, 0])).toBe(false);
    expect(isValidSecretSantaPerm([1, 2, 3, 0])).toBe(true);
  });
});

describe("assignSecretSantas", () => {
  it("requires even count", () => {
    expect(() => assignSecretSantas(people(3))).toThrow(/even/i);
  });

  it("returns a valid pairing", () => {
    const participants = people(6);
    const assignments = assignSecretSantas(participants, () => 0.42);
    expect(assignments).toHaveLength(6);

    const perm = assignments.map((a) =>
      participants.findIndex((p) => p.id === a.recipient.id),
    );
    expect(isValidSecretSantaPerm(perm)).toBe(true);
  });
});
