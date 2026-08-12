import { afterEach, describe, expect, it, vi } from "vitest";
import type { Assignment, Participant } from "../../../shared/types.js";
import { getNotifier } from "./index.js";
import { destinationFor } from "./types.js";
import { stubNotifier } from "./stub.js";
import { testConfig } from "../testConfig.js";

function person(
  overrides: Partial<Participant> & Pick<Participant, "id" | "name">,
): Participant {
  return {
    phone: "(555) 201-0101",
    email: "a@example.com",
    languageIds: ["en"],
    deliveryMode: "send",
    ...overrides,
  };
}

function pair(santa: Participant, recipient: Participant): Assignment {
  return { santa, recipient };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("destinationFor", () => {
  const santa = person({ id: "1", name: "Alex" });
  const recipient = person({ id: "2", name: "Bailey" });

  it("routes smtp to email and phones to E.164", () => {
    expect(destinationFor(pair(santa, recipient), "smtp")).toBe("a@example.com");
    expect(destinationFor(pair(santa, recipient), "twilio")).toBe("+15552010101");
    expect(destinationFor(pair(santa, recipient), "stub")).toBe("(555) 201-0101");
  });

  it("throws when contact data is missing or invalid", () => {
    expect(() =>
      destinationFor(pair(person({ id: "1", name: "Alex", email: undefined }), recipient), "smtp"),
    ).toThrow(/email/);
    expect(() =>
      destinationFor(pair(person({ id: "1", name: "Alex", phone: undefined }), recipient), "twilio"),
    ).toThrow(/phone number/);
    expect(() =>
      destinationFor(pair(person({ id: "1", name: "Alex", phone: "123" }), recipient), "http_sms"),
    ).toThrow(/invalid phone/);
    expect(
      destinationFor(
        pair(person({ id: "1", name: "Alex", phone: undefined, email: undefined }), recipient),
        "stub",
      ),
    ).toBe("unknown");
  });
});

describe("getNotifier", () => {
  it("returns registered providers", () => {
    expect(getNotifier("stub").id).toBe("stub");
    expect(getNotifier("twilio").id).toBe("twilio");
    expect(getNotifier("smtp").id).toBe("smtp");
    expect(getNotifier("aws_sns").id).toBe("aws_sns");
    expect(getNotifier("http_sms").id).toBe("http_sms");
  });
});

describe("stubNotifier", () => {
  it("stubbed deliveries include filled bodies", async () => {
    const santa = person({ id: "1", name: "Alex", languageIds: ["es"] });
    const recipient = person({ id: "2", name: "Bailey" });
    const [delivery] = await stubNotifier.sendAll({
      config: testConfig(),
      assignments: [pair(santa, recipient)],
    });
    expect(delivery?.status).toBe("stubbed");
    expect(delivery?.body).toContain("¡Hola");
  });
});

describe("provider notifiers", () => {
  it("twilio marks sent and failed", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce("raw");
    vi.doMock("twilio", () => ({
      default: () => ({ messages: { create } }),
    }));
    vi.resetModules();
    const { twilioNotifier } = await import("./twilio.js");
    const santa = person({ id: "1", name: "Alex" });
    const recipient = person({ id: "2", name: "Bailey" });
    const config = testConfig({
      notifyProvider: "twilio",
      twilio: { accountSid: "AC", authToken: "tok", from: "+15550001111" },
    });
    const first = await twilioNotifier.sendAll({
      config,
      assignments: [pair(santa, recipient)],
    });
    expect(first[0]?.status).toBe("sent");
    const second = await twilioNotifier.sendAll({
      config,
      assignments: [pair(santa, recipient)],
    });
    expect(second[0]?.status).toBe("failed");
    expect(second[0]?.error).toBe("boom");
    const third = await twilioNotifier.sendAll({
      config,
      assignments: [pair(santa, recipient)],
    });
    expect(third[0]?.error).toBe("Twilio send failed");
    vi.doUnmock("twilio");
  });

  it("smtp marks sent and failed", async () => {
    const sendMail = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockRejectedValueOnce("raw");
    vi.doMock("nodemailer", () => ({
      default: { createTransport: () => ({ sendMail }) },
    }));
    vi.resetModules();
    const { smtpNotifier } = await import("./smtp.js");
    const santa = person({ id: "1", name: "Alex" });
    const recipient = person({ id: "2", name: "Bailey" });
    const config = testConfig({
      notifyProvider: "smtp",
      smtp: {
        host: "smtp.example",
        port: 587,
        secure: false,
        user: "u",
        pass: "p",
        from: "from@example.com",
      },
    });
    expect(
      (await smtpNotifier.sendAll({ config, assignments: [pair(santa, recipient)] }))[0]
        ?.status,
    ).toBe("sent");
    expect(
      (await smtpNotifier.sendAll({ config, assignments: [pair(santa, recipient)] }))[0]
        ?.error,
    ).toBe("smtp down");
    expect(
      (await smtpNotifier.sendAll({ config, assignments: [pair(santa, recipient)] }))[0]
        ?.error,
    ).toBe("SMTP send failed");

    // auth omitted when user/pass empty
    await smtpNotifier.sendAll({
      config: testConfig({
        notifyProvider: "smtp",
        smtp: {
          host: "smtp.example",
          port: 587,
          secure: false,
          user: "",
          pass: "",
          from: "from@example.com",
        },
      }),
      assignments: [pair(santa, recipient)],
    });
    vi.doUnmock("nodemailer");
  });

  it("aws sns marks sent and failed with optional sender id", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("sns"))
      .mockRejectedValueOnce("raw");
    vi.doMock("@aws-sdk/client-sns", () => ({
      SNSClient: class {
        send = send;
      },
      PublishCommand: class {
        input: unknown;
        constructor(input: unknown) {
          this.input = input;
        }
      },
    }));
    vi.resetModules();
    const { awsSnsNotifier } = await import("./awsSns.js");
    const santa = person({ id: "1", name: "Alex" });
    const recipient = person({ id: "2", name: "Bailey" });
    const base = testConfig({
      notifyProvider: "aws_sns",
      awsSns: {
        region: "us-east-1",
        accessKeyId: "AKIA",
        secretAccessKey: "secret",
        senderId: "SANTA",
      },
    });
    expect(
      (await awsSnsNotifier.sendAll({ config: base, assignments: [pair(santa, recipient)] }))[0]
        ?.status,
    ).toBe("sent");
    expect(
      (await awsSnsNotifier.sendAll({ config: base, assignments: [pair(santa, recipient)] }))[0]
        ?.error,
    ).toBe("sns");
    expect(
      (
        await awsSnsNotifier.sendAll({
          config: {
            ...base,
            awsSns: { ...base.awsSns, senderId: undefined },
          },
          assignments: [pair(santa, recipient)],
        })
      )[0]?.error,
    ).toBe("AWS SNS send failed");
    vi.doUnmock("@aws-sdk/client-sns");
  });

  it("http sms handles auth headers and failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce("raw");
    vi.stubGlobal("fetch", fetchMock);

    const { httpSmsNotifier } = await import("./httpSms.js");
    const santa = person({ id: "1", name: "Alex" });
    const recipient = person({ id: "2", name: "Bailey" });

    const authConfig = testConfig({
      notifyProvider: "http_sms",
      httpSms: {
        url: "https://sms.example/send",
        apiKey: "secret",
        authHeader: "Authorization",
      },
    });
    expect(
      (
        await httpSmsNotifier.sendAll({
          config: authConfig,
          assignments: [pair(santa, recipient)],
        })
      )[0]?.status,
    ).toBe("sent");
    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBe("Bearer secret");

    expect(
      (
        await httpSmsNotifier.sendAll({
          config: authConfig,
          assignments: [pair(santa, recipient)],
        })
      )[0]?.error,
    ).toBe("HTTP 500");

    expect(
      (
        await httpSmsNotifier.sendAll({
          config: testConfig({
            notifyProvider: "http_sms",
            httpSms: {
              url: "https://sms.example/send",
              apiKey: "k",
              authHeader: "X-Api-Key",
            },
          }),
          assignments: [pair(santa, recipient)],
        })
      )[0]?.error,
    ).toBe("network");

    expect(
      (
        await httpSmsNotifier.sendAll({
          config: testConfig({
            notifyProvider: "http_sms",
            httpSms: { url: "https://sms.example/send", apiKey: "", authHeader: "Authorization" },
          }),
          assignments: [pair(santa, recipient)],
        })
      )[0]?.error,
    ).toBe("HTTP SMS send failed");
  });
});
