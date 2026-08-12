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
      languageIds: [...input.languageIds],
    };
    this.participants.push(participant);
    return participant;
  }

  updateLanguages(id: string, languageIds: string[]): Participant | null {
    const participant = this.participants.find((p) => p.id === id);
    if (!participant) return null;
    participant.languageIds = [...languageIds];
    return participant;
  }

  pruneLanguages(validIds: Set<string>): void {
    for (const participant of this.participants) {
      participant.languageIds = participant.languageIds.filter((id) =>
        validIds.has(id),
      );
    }
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
      languageIds: [...(p.languageIds || [])],
    }));
  }
}

export function museumDemoSeed(): Participant[] {
  return [
    {
      id: randomUUID(),
      name: "Alex",
      phone: "(555) 201-0101",
      email: "alex@example.com",
      languageIds: ["en"],
    },
    {
      id: randomUUID(),
      name: "Bailey",
      phone: "(555) 201-0102",
      email: "bailey@example.com",
      languageIds: ["es"],
    },
    {
      id: randomUUID(),
      name: "Casey",
      phone: "(555) 201-0103",
      email: "casey@example.com",
      languageIds: ["en", "es"],
    },
    {
      id: randomUUID(),
      name: "Drew",
      phone: "(555) 201-0104",
      email: "drew@example.com",
      languageIds: ["en"],
    },
  ];
}
