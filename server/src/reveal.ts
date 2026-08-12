import type { Assignment } from "../../shared/types.js";

export interface RevealStatus {
  active: boolean;
  complete: boolean;
  index: number;
  total: number;
  santaName: string | null;
  santaId: string | null;
}

export class RevealSession {
  private assignments: Assignment[] = [];
  private index = 0;
  private active = false;

  start(assignments: Assignment[]): void {
    // Shuffle reveal order so arrival sequence is not the roster order.
    const copy = [...assignments];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    this.assignments = copy;
    this.index = 0;
    this.active = true;
  }

  clear(): void {
    this.assignments = [];
    this.index = 0;
    this.active = false;
  }

  getAssignments(): Assignment[] {
    return [...this.assignments];
  }

  isActive(): boolean {
    return this.active;
  }

  status(): RevealStatus {
    if (!this.active) {
      return {
        active: false,
        complete: false,
        index: 0,
        total: 0,
        santaName: null,
        santaId: null,
      };
    }

    if (this.index >= this.assignments.length) {
      return {
        active: true,
        complete: true,
        index: this.assignments.length,
        total: this.assignments.length,
        santaName: null,
        santaId: null,
      };
    }

    const current = this.assignments[this.index]!;
    return {
      active: true,
      complete: false,
      index: this.index,
      total: this.assignments.length,
      santaName: current.santa.name,
      santaId: current.santa.id,
    };
  }

  peek(): { recipientName: string } | null {
    if (!this.active || this.index >= this.assignments.length) return null;
    return { recipientName: this.assignments[this.index]!.recipient.name };
  }

  confirm(): RevealStatus {
    if (!this.active || this.index >= this.assignments.length) {
      return this.status();
    }
    this.index += 1;
    return this.status();
  }
}
