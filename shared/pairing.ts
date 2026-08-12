import type { Assignment, Participant } from "./types.js";

function shuffleInPlace<T>(items: T[], random = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** True if mapping i -> perm[i] is a derangement with no 2-cycles. */
export function isValidSecretSantaPerm(perm: number[]): boolean {
  const n = perm.length;
  if (n < 2 || n % 2 !== 0) return false;

  for (let i = 0; i < n; i += 1) {
    const j = perm[i];
    if (j === undefined || j < 0 || j >= n) return false;
    if (j === i) return false;
    if (perm[j] === i) return false;
  }

  const seen = new Set<number>();
  for (const j of perm) {
    if (seen.has(j)) return false;
    seen.add(j);
  }
  return seen.size === n;
}

/**
 * Pair each santa with a unique recipient: no self-gifts, no mutual pairs.
 * Requires an even participant count >= 2.
 */
export function assignSecretSantas(
  participants: Participant[],
  random = Math.random,
  maxAttempts = 5000,
): Assignment[] {
  const n = participants.length;
  if (n < 2) {
    throw new Error("Need at least 2 participants.");
  }
  if (n % 2 !== 0) {
    throw new Error("Participant count must be even.");
  }

  const indices = participants.map((_, i) => i);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const perm = shuffleInPlace([...indices], random);
    if (!isValidSecretSantaPerm(perm)) continue;

    return participants.map((santa, i) => ({
      santa,
      recipient: participants[perm[i]!]!,
    }));
  }

  throw new Error("Could not find a valid Secret Santa pairing. Try again.");
}
