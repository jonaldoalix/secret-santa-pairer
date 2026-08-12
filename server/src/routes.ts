import { Router } from "express";
import { z } from "zod";
import { DEFAULT_EN, DEFAULT_ES } from "../../shared/message.js";
import { assignSecretSantas } from "../../shared/pairing.js";
import { formatPhoneDisplay, normalizePhone } from "../../shared/phone.js";
import type { AssignResult, PublicConfig } from "../../shared/types.js";
import type { AppConfig } from "./config.js";
import { assertProviderReady } from "./config.js";
import { getNotifier } from "./notify/index.js";
import { museumDemoSeed, type ParticipantStore } from "./store.js";

const participantBody = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).optional(),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.union([z.undefined(), z.string().email()])),
});

const editableConfigBody = z.object({
  giftBudget: z.string().trim().min(1).max(40),
  eventDate: z.string().trim().min(1).max(80),
  eventLabel: z.string().trim().min(1).max(80),
  messageLocale: z.enum(["en", "es", "bilingual"]),
  templateEn: z.string().trim().min(1).max(2000),
  templateEs: z.string().trim().min(1).max(2000),
});

function publicConfig(config: AppConfig, store: ParticipantStore): PublicConfig {
  return {
    museumMode: config.museumMode,
    notifyProvider: config.notifyProvider,
    contactMode: config.contactMode,
    giftBudget: config.giftBudget,
    eventDate: config.eventDate,
    eventLabel: config.eventLabel,
    messageLocale: config.messageLocale,
    templateEn: config.templateEn || DEFAULT_EN,
    templateEs: config.templateEs || DEFAULT_ES,
    participantCount: store.count(),
  };
}

export function createApiRouter(config: AppConfig, store: ParticipantStore): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/config", (_req, res) => {
    res.json(publicConfig(config, store));
  });

  router.patch("/config", (req, res) => {
    const parsed = editableConfigBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings payload." });
      return;
    }

    config.giftBudget = parsed.data.giftBudget;
    config.eventDate = parsed.data.eventDate;
    config.eventLabel = parsed.data.eventLabel;
    config.messageLocale = parsed.data.messageLocale;
    config.templateEn = parsed.data.templateEn;
    config.templateEs = parsed.data.templateEs;

    res.json(publicConfig(config, store));
  });

  router.get("/participants", (_req, res) => {
    res.json({ participants: store.list() });
  });

  router.post("/participants", (req, res) => {
    const parsed = participantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid participant payload." });
      return;
    }

    const { name, email } = parsed.data;
    const emailValue = email || undefined;
    const rawPhone = parsed.data.phone?.trim() || "";
    let phoneValue: string | undefined;

    if (rawPhone) {
      const normalized = normalizePhone(rawPhone);
      if (!normalized) {
        res.status(400).json({
          error: "Phone must be a 10-digit US/Canada number (e.g. 2813308004).",
        });
        return;
      }
      phoneValue = formatPhoneDisplay(normalized);
    }

    if (config.contactMode === "phone" && !phoneValue) {
      res.status(400).json({ error: "Phone number is required for this notify provider." });
      return;
    }
    if (config.contactMode === "email" && !emailValue) {
      res.status(400).json({ error: "Email is required for this notify provider." });
      return;
    }
    if (config.contactMode === "either" && !phoneValue && !emailValue) {
      res.status(400).json({ error: "Provide a phone number or email." });
      return;
    }

    const participant = store.add({ name, phone: phoneValue, email: emailValue });
    res.status(201).json({ participant, participants: store.list() });
  });

  router.delete("/participants/:id", (req, res) => {
    const removed = store.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Participant not found." });
      return;
    }
    res.json({ participants: store.list() });
  });

  router.post("/reset", (_req, res) => {
    if (config.seedMuseumDemo) {
      store.reset(museumDemoSeed());
    } else {
      store.reset([]);
    }
    res.json({ participants: store.list() });
  });

  router.post("/assign", async (_req, res) => {
    try {
      assertProviderReady(config);
      const participants = store.list();
      if (participants.length < 3) {
        res.status(400).json({
          error:
            "Need at least 3 participants before assigning (2 people can only swap with each other).",
        });
        return;
      }

      const assignments = assignSecretSantas(participants);
      const notifier = getNotifier(config.notifyProvider);
      const deliveries = await notifier.sendAll({ config, assignments });

      const result: AssignResult = {
        assignmentCount: assignments.length,
        deliveries: deliveries.map((d) =>
          config.museumMode
            ? d
            : {
                ...d,
                body: "[redacted]",
              },
        ),
        museumMode: config.museumMode,
      };

      res.json(result);
    } catch (error) {
      console.error("assign failed", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Assignment failed.",
      });
    }
  });

  return router;
}
