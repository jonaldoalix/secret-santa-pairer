import type { MessageLocale } from "./types.js";

export interface MessageContext {
  santaName: string;
  recipientName: string;
  budget: string;
  eventDate: string;
  eventLabel: string;
  locale: MessageLocale;
  templateEn?: string;
  templateEs?: string;
}

const DEFAULT_EN =
  "Hello {santa}! Your Secret Santa recipient is: {recipient}. DO NOT SHARE THIS WITH ANYONE. The budget is {budget}. See you {date}!";

const DEFAULT_ES =
  "¡Hola {santa}! Su asignación para Secret Santa es {recipient}. MANTÉNGALO UN SECRETO. Por favor no excedas el presupuesto de {budget}. ¡Nos vemos {date}!";

function fill(template: string, ctx: MessageContext): string {
  return template
    .replaceAll("{santa}", ctx.santaName)
    .replaceAll("{recipient}", ctx.recipientName)
    .replaceAll("{budget}", ctx.budget)
    .replaceAll("{date}", ctx.eventDate)
    .replaceAll("{event}", ctx.eventLabel);
}

export function buildNotifyBody(ctx: MessageContext): string {
  const en = fill(ctx.templateEn || DEFAULT_EN, ctx);
  const es = fill(ctx.templateEs || DEFAULT_ES, ctx);

  if (ctx.locale === "en") return en;
  if (ctx.locale === "es") return es;
  return `${en}\n\n${es}`;
}
