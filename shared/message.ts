import type { MessageBlock } from "./types.js";

export interface MessageContext {
  santaName: string;
  recipientName: string;
  budget: string;
  eventDate: string;
  eventLabel: string;
  messages: MessageBlock[];
}

export const DEFAULT_MESSAGES: MessageBlock[] = [
  {
    label: "English",
    body: "Hello {santa}! Your Secret Santa recipient is: {recipient}. DO NOT SHARE THIS WITH ANYONE. The budget is {budget}. See you {date}!",
  },
  {
    label: "Español",
    body: "¡Hola {santa}! Su asignación para Secret Santa es {recipient}. MANTÉNGALO UN SECRETO. Por favor no excedas el presupuesto de {budget}. ¡Nos vemos {date}!",
  },
];

function fill(template: string, ctx: MessageContext): string {
  return template
    .replaceAll("{santa}", ctx.santaName)
    .replaceAll("{recipient}", ctx.recipientName)
    .replaceAll("{budget}", ctx.budget)
    .replaceAll("{date}", ctx.eventDate)
    .replaceAll("{event}", ctx.eventLabel);
}

/** Fill every non-empty message block and join with blank lines (any languages). */
export function buildNotifyBody(ctx: MessageContext): string {
  const blocks = (ctx.messages.length > 0 ? ctx.messages : DEFAULT_MESSAGES)
    .map((m) => fill(m.body.trim(), ctx))
    .filter((body) => body.length > 0);

  if (blocks.length === 0) {
    throw new Error("Add at least one message template before notifying.");
  }

  return blocks.join("\n\n");
}
