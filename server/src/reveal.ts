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
  private allAssignments: Assignment[] = [];
  private revealQueue: Assignment[] = [];
  private index = 0;
  private active = false;

  start(assignments: Assignment[]): void {
    this.allAssignments = [...assignments];
    const revealOnes = assignments.filter((a) => a.santa.deliveryMode === "reveal");
    const copy = [...revealOnes];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    this.revealQueue = copy;
    this.index = 0;
    this.active = copy.length > 0;
  }

  clear(): void {
    this.allAssignments = [];
    this.revealQueue = [];
    this.index = 0;
    this.active = false;
  }

  getAssignments(): Assignment[] {
    return [...this.allAssignments];
  }

  getSendAssignments(): Assignment[] {
    return this.allAssignments.filter((a) => a.santa.deliveryMode === "send");
  }

  isActive(): boolean {
    return this.active;
  }

  status(): RevealStatus {
    if (!this.active) {
      return {
        active: false,
        complete: this.allAssignments.length > 0 && this.revealQueue.length === 0,
        index: 0,
        total: 0,
        santaName: null,
        santaId: null,
      };
    }

    if (this.index >= this.revealQueue.length) {
      return {
        active: true,
        complete: true,
        index: this.revealQueue.length,
        total: this.revealQueue.length,
        santaName: null,
        santaId: null,
      };
    }

    const current = this.revealQueue[this.index]!;
    return {
      active: true,
      complete: false,
      index: this.index,
      total: this.revealQueue.length,
      santaName: current.santa.name,
      santaId: current.santa.id,
    };
  }

  peek(): { recipientName: string } | null {
    if (!this.active || this.index >= this.revealQueue.length) return null;
    return { recipientName: this.revealQueue[this.index]!.recipient.name };
  }

  confirm(): RevealStatus {
    if (!this.active || this.index >= this.revealQueue.length) {
      return this.status();
    }
    this.index += 1;
    return this.status();
  }
}
