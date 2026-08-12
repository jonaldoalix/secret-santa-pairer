import type { MessageBlock } from "./types.js";

export interface MessageContext {
  santaName: string;
  recipientName: string;
  budget: string;
  eventDate: string;
  eventLabel: string;
  messages: MessageBlock[];
  /** If set, only include these message block ids. */
  languageIds?: string[];
}

export const DEFAULT_MESSAGES: MessageBlock[] = [
  {
    id: "en",
    label: "English",
    body: "Hello {santa}! Your Secret Santa recipient is: {recipient}. DO NOT SHARE THIS WITH ANYONE. The budget is {budget}. See you {date}!",
  },
  {
    id: "es",
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

/** Fill selected message blocks and join with blank lines. */
export function buildNotifyBody(ctx: MessageContext): string {
  const catalog = ctx.messages.length > 0 ? ctx.messages : DEFAULT_MESSAGES;
  const wanted =
    ctx.languageIds && ctx.languageIds.length > 0
      ? new Set(ctx.languageIds)
      : null;

  const blocks = catalog
    .filter((m) => (wanted ? wanted.has(m.id) : true))
    .map((m) => fill(m.body.trim(), ctx))
    .filter((body) => body.length > 0);

  if (blocks.length === 0) {
    throw new Error(
      `No message languages selected for ${ctx.santaName}. Pick at least one language.`,
    );
  }

  return blocks.join("\n\n");
}
