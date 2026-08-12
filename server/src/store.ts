import { randomUUID } from "node:crypto";
import type { Participant } from "../../shared/types.js";

export class ParticipantStore {
  private participants: Participant[] = [];

  list(): Participant[] {
    return [...this.participants];
  }

  count(): number {
    return this.participants.length;
  }

  add(input: Omit<Participant, "id">): Participant {
    const participant: Participant = {
      id: randomUUID(),
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
    };
    this.participants.push(participant);
    return participant;
  }

  remove(id: string): boolean {
    const before = this.participants.length;
    this.participants = this.participants.filter((p) => p.id !== id);
    return this.participants.length < before;
  }

  reset(seed: Participant[] = []): void {
    this.participants = seed.map((p) => ({
      ...p,
      id: p.id || randomUUID(),
    }));
  }
}

export function museumDemoSeed(): Participant[] {
  return [
    { id: randomUUID(), name: "Alex", phone: "+15550101", email: "alex@example.com" },
    { id: randomUUID(), name: "Bailey", phone: "+15550102", email: "bailey@example.com" },
    { id: randomUUID(), name: "Casey", phone: "+15550103", email: "casey@example.com" },
    { id: randomUUID(), name: "Drew", phone: "+15550104", email: "drew@example.com" },
  ];
}
