import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { RevealSession } from "./reveal.js";
import { ParticipantStore } from "./store.js";
import { testConfig } from "./testConfig.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createApp + API routes", () => {
  it("serves health, config, and security headers", async () => {
    const { app } = createApp(testConfig());
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");

    const config = await request(app).get("/api/config");
    expect(config.body.notifyProvider).toBe("stub");
  });

  it("validates and mutates participants + settings", async () => {
    const { app, store } = createApp(testConfig());

    expect((await request(app).post("/api/participants").send({})).status).toBe(400);

    expect(
      (
        await request(app)
          .post("/api/participants")
          .send({
            name: "Alex",
            phone: "123",
            languageIds: ["en"],
            deliveryMode: "reveal",
          })
      ).body.error,
    ).toMatch(/Phone/);

    expect(
      (
        await request(app)
          .post("/api/participants")
          .send({
            name: "Alex",
            languageIds: ["en"],
            deliveryMode: "reveal",
          })
      ).body.error,
    ).toMatch(/phone number or email/);

    const created = await request(app)
      .post("/api/participants")
      .send({
        name: "Alex",
        phone: "2813308004",
        email: "",
        languageIds: ["en", "en", "zz"],
        deliveryMode: "reveal",
      });
    expect(created.status).toBe(201);
    const id = created.body.participant.id as string;

    expect(
      (
        await request(app)
          .post("/api/participants")
          .send({
            name: "NoLang",
            phone: "2813308005",
            languageIds: ["zz"],
            deliveryMode: "reveal",
          })
      ).status,
    ).toBe(400);

    expect(
      (await request(app).patch(`/api/participants/${id}/delivery`).send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/participants/missing/delivery`)
          .send({ deliveryMode: "send" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/participants/${id}/delivery`)
          .send({ deliveryMode: "send" })
      ).status,
    ).toBe(200);

    expect(
      (await request(app).patch(`/api/participants/${id}/languages`).send({})).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/participants/${id}/languages`)
          .send({ languageIds: ["zz"] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/participants/missing/languages`)
          .send({ languageIds: ["en"] })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/participants/${id}/languages`)
          .send({ languageIds: ["es"] })
      ).status,
    ).toBe(200);

    expect((await request(app).get("/api/participants")).body.participants).toHaveLength(1);

    expect((await request(app).patch("/api/config").send({})).status).toBe(400);
    expect(
      (
        await request(app)
          .patch("/api/config")
          .send({
            giftBudget: "$30",
            eventDate: "Dec 25",
            eventLabel: "Party",
            messages: [
              { id: "en", label: "English", body: "Hi {santa}" },
              { id: "en", label: "Dup", body: "Dup" },
            ],
          })
      ).body.error,
    ).toMatch(/unique id/);

    const patched = await request(app)
      .patch("/api/config")
      .send({
        giftBudget: "$30",
        eventDate: "Dec 25",
        eventLabel: "Party",
        messages: [{ id: "en", label: "English", body: "Hi {santa} {recipient} {budget} {date} {event}" }],
      });
    expect(patched.status).toBe(200);
    // Participant still had only "es"; pruning drops unknown ids rather than remapping.
    expect(store.list()[0]?.languageIds).toEqual([]);

    expect((await request(app).delete(`/api/participants/missing`)).status).toBe(404);
    expect((await request(app).delete(`/api/participants/${id}`)).status).toBe(200);

    await request(app).post("/api/reset");
    expect(store.count()).toBe(0);
  });

  it("enforces contact mode requirements", async () => {
    const phoneApp = createApp(testConfig({ notifyProvider: "twilio" })).app;
    expect(
      (
        await request(phoneApp)
          .post("/api/participants")
          .send({
            name: "Alex",
            email: "a@example.com",
            languageIds: ["en"],
            deliveryMode: "reveal",
          })
      ).status,
    ).toBe(400);

    const emailApp = createApp(testConfig({ notifyProvider: "smtp" })).app;
    expect(
      (
        await request(emailApp)
          .post("/api/participants")
          .send({
            name: "Alex",
            phone: "2813308004",
            languageIds: ["en"],
            deliveryMode: "reveal",
          })
      ).status,
    ).toBe(400);
  });

  it("assigns, reveals, notifies, and resets museum seed", async () => {
    const store = new ParticipantStore();
    const reveal = new RevealSession();
    const { app } = createApp(testConfig(), store, reveal);

    for (const [name, phone, mode] of [
      ["Alex", "2813308001", "reveal"],
      ["Bailey", "2813308002", "send"],
      ["Casey", "2813308003", "reveal"],
    ] as const) {
      const res = await request(app)
        .post("/api/participants")
        .send({
          name,
          phone,
          languageIds: ["en"],
          deliveryMode: mode,
        });
      expect(res.status).toBe(201);
    }

    expect((await request(app).post("/api/assign")).status).toBe(200);
    expect((await request(app).get("/api/reveal")).body.active).toBe(true);
    expect((await request(app).post("/api/reveal/peek")).body.recipientName).toBeTruthy();
    expect((await request(app).post("/api/reveal/confirm")).body.index).toBe(1);
    expect((await request(app).post("/api/notify")).body.sent).toBeGreaterThan(0);
    expect((await request(app).post("/api/reveal/cancel")).body.active).toBe(false);
  });

  it("handles assign/notify error paths", async () => {
    const { app, store } = createApp(testConfig());
    expect((await request(app).post("/api/assign")).status).toBe(400);
    expect((await request(app).post("/api/notify")).status).toBe(400);
    expect((await request(app).post("/api/reveal/peek")).status).toBe(400);
    expect((await request(app).post("/api/reveal/confirm")).status).toBe(400);

    for (const name of ["A", "B", "C"]) {
      await request(app)
        .post("/api/participants")
        .send({
          name,
          phone: `281330800${name.charCodeAt(0) % 10}`,
          languageIds: ["en"],
          deliveryMode: "reveal",
        });
    }
    // Force invalid phone digits to still create via store, then clear languages.
    store.list()[0]!.languageIds = [];
    expect((await request(app).post("/api/assign")).status).toBe(400);

    // send mode without provider credentials
    const live = createApp(
      testConfig({
        notifyProvider: "twilio",
        twilio: { accountSid: "", authToken: "", from: "" },
      }),
    );
    for (const [name, phone] of [
      ["A", "2813308011"],
      ["B", "2813308012"],
      ["C", "2813308013"],
    ]) {
      await request(live.app)
        .post("/api/participants")
        .send({
          name,
          phone,
          languageIds: ["en"],
          deliveryMode: "send",
        });
    }
    expect((await request(live.app).post("/api/assign")).status).toBe(500);

    // assign throws from pairing
    const boom = createApp(testConfig());
    for (const [name, phone] of [
      ["A", "2813308021"],
      ["B", "2813308022"],
      ["C", "2813308023"],
    ]) {
      await request(boom.app)
        .post("/api/participants")
        .send({
          name,
          phone,
          languageIds: ["en"],
          deliveryMode: "reveal",
        });
    }
    vi.spyOn(await import("../../shared/pairing.js"), "assignSecretSantas").mockImplementation(
      () => {
        throw new Error("nope");
      },
    );
    expect((await request(boom.app).post("/api/assign")).status).toBe(500);
  });

  it("seeds museum demo on reset and serves static client when present", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "santa-dist-"));
    fs.writeFileSync(path.join(dir, "index.html"), "<html>ok</html>");
    fs.writeFileSync(path.join(dir, "sw.js"), "/* sw */");
    fs.writeFileSync(path.join(dir, "workbox-abc.js"), "/* wb */");

    const { app, store } = createApp(
      testConfig({
        museumMode: true,
        seedMuseumDemo: true,
        clientDist: dir,
      }),
    );
    expect(store.count()).toBe(4);
    await request(app).post("/api/participants").send({
      name: "Extra",
      phone: "2813308099",
      languageIds: ["en"],
      deliveryMode: "reveal",
    });
    await request(app).post("/api/reset");
    expect(store.count()).toBe(4);

    const page = await request(app).get("/");
    expect(page.status).toBe(200);
    expect(page.text).toContain("ok");

    // Non-file path hits the SPA sendFile fallback (not express.static index).
    const spa = await request(app).get("/host/setup");
    expect(spa.status).toBe(200);
    expect(spa.text).toContain("ok");

    const sw = await request(app).get("/sw.js");
    expect(sw.headers["cache-control"]).toBe("no-cache");
    const wb = await request(app).get("/workbox-abc.js");
    expect(wb.headers["cache-control"]).toBe("no-cache");
  });

  it("returns 500 when notify provider throws", async () => {
    const store = new ParticipantStore();
    const reveal = new RevealSession();
    const { app } = createApp(testConfig(), store, reveal);

    for (const [name, phone, mode] of [
      ["Alex", "2813308031", "reveal"],
      ["Bailey", "2813308032", "send"],
      ["Casey", "2813308033", "reveal"],
    ] as const) {
      await request(app)
        .post("/api/participants")
        .send({
          name,
          phone,
          languageIds: ["en"],
          deliveryMode: mode,
        });
    }
    await request(app).post("/api/assign");

    vi.spyOn(await import("./notify/index.js"), "getNotifier").mockReturnValue({
      id: "stub",
      sendAll: async () => {
        throw new Error("notifier down");
      },
    });

    expect((await request(app).post("/api/notify")).status).toBe(500);
  });
});
