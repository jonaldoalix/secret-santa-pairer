import { Router } from "express";
import { z } from "zod";
import { assignSecretSantas } from "../../shared/pairing.js";
import { formatPhoneDisplay, normalizePhone } from "../../shared/phone.js";
import type { AssignResult, PublicConfig } from "../../shared/types.js";
import type { AppConfig } from "./config.js";
import { assertProviderReady } from "./config.js";
import { getNotifier } from "./notify/index.js";
import type { RevealSession } from "./reveal.js";
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
  languageIds: z.array(z.string().trim().min(1).max(64)).min(1).max(8),
  deliveryMode: z.enum(["reveal", "send"]),
});

const messageBlock = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(40),
  body: z.string().trim().min(1).max(2000),
});

const editableConfigBody = z.object({
  giftBudget: z.string().trim().min(1).max(40),
  eventDate: z.string().trim().min(1).max(80),
  eventLabel: z.string().trim().min(1).max(80),
  messages: z.array(messageBlock).min(1).max(8),
});

function publicConfig(config: AppConfig, store: ParticipantStore): PublicConfig {
  return {
    museumMode: config.museumMode,
    notifyProvider: config.notifyProvider,
    contactMode: config.contactMode,
    giftBudget: config.giftBudget,
    eventDate: config.eventDate,
    eventLabel: config.eventLabel,
    messages: config.messages.map((m) => ({ ...m })),
    participantCount: store.count(),
  };
}

export function createApiRouter(
  config: AppConfig,
  store: ParticipantStore,
  reveal: RevealSession,
): Router {
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

    const ids = parsed.data.messages.map((m) => m.id);
    if (new Set(ids).size !== ids.length) {
      res.status(400).json({ error: "Each message language needs a unique id." });
      return;
    }

    config.giftBudget = parsed.data.giftBudget;
    config.eventDate = parsed.data.eventDate;
    config.eventLabel = parsed.data.eventLabel;
    config.messages = parsed.data.messages.map((m) => ({ ...m }));
    store.pruneLanguages(new Set(ids));

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

    const { name, email, languageIds, deliveryMode } = parsed.data;
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

    const known = new Set(config.messages.map((m) => m.id));
    const selected = [...new Set(languageIds)].filter((id) => known.has(id));
    if (selected.length === 0) {
      res.status(400).json({
        error: "Pick at least one language for this participant.",
      });
      return;
    }

    const participant = store.add({
      name,
      phone: phoneValue,
      email: emailValue,
      languageIds: selected,
      deliveryMode,
    });
    res.status(201).json({ participant, participants: store.list() });
  });

  router.patch("/participants/:id/delivery", (req, res) => {
    const mode = z.enum(["reveal", "send"]).safeParse(req.body?.deliveryMode);
    if (!mode.success) {
      res.status(400).json({ error: "deliveryMode must be reveal or send." });
      return;
    }
    const participant = store.updateDeliveryMode(req.params.id, mode.data);
    if (!participant) {
      res.status(404).json({ error: "Participant not found." });
      return;
    }
    res.json({ participant, participants: store.list() });
  });

  router.patch("/participants/:id/languages", (req, res) => {
    const languageIds = z
      .array(z.string().trim().min(1).max(64))
      .min(1)
      .max(8)
      .safeParse(req.body?.languageIds);
    if (!languageIds.success) {
      res.status(400).json({ error: "Pick at least one language." });
      return;
    }

    const known = new Set(config.messages.map((m) => m.id));
    const selected = [...new Set(languageIds.data)].filter((id) => known.has(id));
    if (selected.length === 0) {
      res.status(400).json({ error: "Pick at least one valid language." });
      return;
    }

    const participant = store.updateLanguages(req.params.id, selected);
    if (!participant) {
      res.status(404).json({ error: "Participant not found." });
      return;
    }
    res.json({ participant, participants: store.list() });
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
    reveal.clear();
    if (config.seedMuseumDemo) {
      store.reset(museumDemoSeed());
    } else {
      store.reset([]);
    }
    res.json({ participants: store.list() });
  });

  router.post("/assign", async (_req, res) => {
    try {
      const participants = store.list();
      if (participants.length < 3) {
        res.status(400).json({
          error:
            "Need at least 3 participants before assigning (2 people can only swap with each other).",
        });
        return;
      }

      const missingLang = participants.find((p) => p.languageIds.length === 0);
      if (missingLang) {
        res.status(400).json({
          error: `${missingLang.name} needs at least one notify language.`,
        });
        return;
      }

      const sendPeople = participants.filter((p) => p.deliveryMode === "send");
      if (sendPeople.length > 0) {
        assertProviderReady(config);
      }

      const assignments = assignSecretSantas(participants);
      reveal.start(assignments);

      let sentCount = 0;
      let failedCount = 0;
      const toSend = reveal.getSendAssignments();
      if (toSend.length > 0) {
        const notifier = getNotifier(config.notifyProvider);
        const deliveries = await notifier.sendAll({ config, assignments: toSend });
        sentCount = deliveries.filter(
          (d) => d.status === "sent" || d.status === "stubbed",
        ).length;
        failedCount = deliveries.filter((d) => d.status === "failed").length;
      }

      const revealStatus = reveal.status();
      const result: AssignResult = {
        assignmentCount: assignments.length,
        revealCount: revealStatus.total,
        sentCount,
        failedCount,
        revealReady: revealStatus.active && !revealStatus.complete,
        museumMode: config.museumMode,
      };
      res.json(result);
    } catch (error) {
      console.error("assign failed", error);
      res.status(500).json({ error: "Assignment failed." });
    }
  });

  router.get("/reveal", (_req, res) => {
    res.json(reveal.status());
  });

  router.post("/reveal/peek", (_req, res) => {
    const peek = reveal.peek();
    if (!peek) {
      res.status(400).json({ error: "No active reveal for a player right now." });
      return;
    }
    res.json(peek);
  });

  router.post("/reveal/confirm", (_req, res) => {
    const status = reveal.status();
    if (!status.active || status.complete || !status.santaName) {
      res.status(400).json({ error: "No player waiting to confirm." });
      return;
    }
    res.json(reveal.confirm());
  });

  router.post("/reveal/cancel", (_req, res) => {
    reveal.clear();
    res.json(reveal.status());
  });

  router.post("/notify", async (_req, res) => {
    try {
      assertProviderReady(config);
      const assignments = reveal.getSendAssignments();
      if (assignments.length === 0) {
        res.status(400).json({
          error: "No send-mode participants in the current pairing.",
        });
        return;
      }

      const notifier = getNotifier(config.notifyProvider);
      const deliveries = await notifier.sendAll({ config, assignments });
      res.json({
        sent: deliveries.filter((d) => d.status === "sent" || d.status === "stubbed")
          .length,
        failed: deliveries.filter((d) => d.status === "failed").length,
        museumMode: config.museumMode,
        deliveries: deliveries.map((d) => ({
          santaName: d.santaName,
          status: d.status,
          channel: d.channel,
          // Never echo message bodies or destinations to the browser.
          to: "[redacted]",
          body: "[redacted]",
        })),
      });
    } catch (error) {
      console.error("notify failed", error);
      res.status(500).json({ error: "Notify failed." });
    }
  });

  return router;
}
