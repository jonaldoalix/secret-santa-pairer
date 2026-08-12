import { describe, expect, it } from "vitest";
import { assignSecretSantas, isValidSecretSantaPerm } from "./pairing.js";
import type { Participant } from "./types.js";

function people(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `P${i}`,
    phone: `555000${String(i).padStart(4, "0")}`,
    languageIds: ["en"],
    deliveryMode: "reveal" as const,
  }));
}

describe("isValidSecretSantaPerm", () => {
  it("rejects self, reciprocal, duplicate, and out-of-range maps", () => {
    expect(isValidSecretSantaPerm([0, 1])).toBe(false);
    expect(isValidSecretSantaPerm([1, 0])).toBe(false);
    expect(isValidSecretSantaPerm([1, 2, 0])).toBe(true);
    expect(isValidSecretSantaPerm([1, 2, 3, 0])).toBe(true);
    expect(isValidSecretSantaPerm([1, 0, 2])).toBe(false); // reciprocal 0<->1
    expect(isValidSecretSantaPerm([1, 1, 0])).toBe(false); // duplicate target
    expect(isValidSecretSantaPerm([1, 2, 9])).toBe(false); // out of range
    expect(isValidSecretSantaPerm([1, undefined as unknown as number, 0])).toBe(
      false,
    );
    // Duplicate targets without an earlier reciprocal short-circuit.
    expect(isValidSecretSantaPerm([1, 2, 3, 1])).toBe(false);
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

  it("exhausts attempts when random never yields a valid perm", () => {
    // random ~1 keeps Fisher-Yates as the identity map (all self-gifts) → invalid.
    expect(() => assignSecretSantas(people(3), () => 0.999, 5)).toThrow(
      /Could not find/,
    );
  });
});
