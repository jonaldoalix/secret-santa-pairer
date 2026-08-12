import { describe, expect, it } from "vitest";
import type { Assignment, Participant } from "../../shared/types.js";
import { RevealSession } from "./reveal.js";

function person(
  id: string,
  name: string,
  deliveryMode: Participant["deliveryMode"],
): Participant {
  return {
    id,
    name,
    phone: "(555) 000-0000",
    languageIds: ["en"],
    deliveryMode,
  };
}

function assignment(santa: Participant, recipient: Participant): Assignment {
  return { santa, recipient };
}

describe("RevealSession", () => {
  it("queues only reveal-mode santas and peeks/confirms in order", () => {
    const reveal = new RevealSession();
    expect(reveal.status().active).toBe(false);
    expect(reveal.peek()).toBeNull();

    const a = person("1", "Alex", "reveal");
    const b = person("2", "Bailey", "send");
    const c = person("3", "Casey", "reveal");
    const assignments = [
      assignment(a, b),
      assignment(b, c),
      assignment(c, a),
    ];

    reveal.start(assignments);
    expect(reveal.isActive()).toBe(true);
    expect(reveal.getAssignments()).toHaveLength(3);
    expect(reveal.getSendAssignments()).toHaveLength(1);
    expect(reveal.status().total).toBe(2);
    expect(reveal.peek()?.recipientName).toBeTruthy();

    reveal.confirm();
    reveal.confirm();
    expect(reveal.status().complete).toBe(true);
    expect(reveal.peek()).toBeNull();
    expect(reveal.confirm().complete).toBe(true);

    reveal.clear();
    expect(reveal.isActive()).toBe(false);
    expect(reveal.status()).toMatchObject({
      active: false,
      complete: false,
      total: 0,
    });
  });

  it("marks send-only pairings complete without an active reveal", () => {
    const reveal = new RevealSession();
    const a = person("1", "Alex", "send");
    const b = person("2", "Bailey", "send");
    const c = person("3", "Casey", "send");
    reveal.start([assignment(a, b), assignment(b, c), assignment(c, a)]);
    expect(reveal.status()).toMatchObject({
      active: false,
      complete: true,
      total: 0,
    });
  });
});
