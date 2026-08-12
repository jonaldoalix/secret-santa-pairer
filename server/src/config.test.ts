import { afterEach, describe, expect, it, vi } from "vitest";
import { assertProviderReady, findRoot, loadConfig } from "./config.js";
import { testConfig } from "./testConfig.js";

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
  vi.restoreAllMocks();
});

describe("findRoot", () => {
  it("returns start when no package.json exists up the tree", () => {
    const start = "/tmp/secret-santa-no-package-root";
    expect(findRoot(start)).toBe(start);
  });

  it("finds this repository root", () => {
    expect(findRoot(process.cwd())).toMatch(/secret-santa-pairer$/);
  });
});

describe("loadConfig", () => {
  it("defaults to stub provider outside museum mode", () => {
    delete process.env.NOTIFY_PROVIDER;
    delete process.env.MUSEUM_MODE;
    delete process.env.PORT;
    delete process.env.GIFT_BUDGET;
    delete process.env.EVENT_DATE;
    delete process.env.EVENT_LABEL;
    delete process.env.SEED_MUSEUM_DEMO;
    delete process.env.AWS_REGION;
    delete process.env.AWS_SNS_REGION;
    delete process.env.AWS_SNS_SENDER_ID;
    const config = loadConfig();
    expect(config.notifyProvider).toBe("stub");
    expect(config.museumMode).toBe(false);
    expect(config.contactMode).toBe("either");
    expect(config.port).toBe(3024);
    expect(config.giftBudget).toBe("$25");
    expect(config.awsSns.region).toBe("us-east-1");
    expect(config.awsSns.senderId).toBeUndefined();
  });

  it("forces stub when museum mode is on", () => {
    process.env.MUSEUM_MODE = "true";
    process.env.NOTIFY_PROVIDER = "twilio";
    delete process.env.SEED_MUSEUM_DEMO;
    const config = loadConfig();
    expect(config.museumMode).toBe(true);
    expect(config.notifyProvider).toBe("stub");
    expect(config.seedMuseumDemo).toBe(true);
  });

  it("defaults empty twilio fields when unset", () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    const config = loadConfig();
    expect(config.twilio).toEqual({
      accountSid: "",
      authToken: "",
      from: "",
    });
  });

  it("reads twilio and smtp credential env when present", () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_PHONE_NUMBER = "+15551234567";
    process.env.SMTP_HOST = "smtp.example";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    process.env.SMTP_FROM = "from@example.com";
    process.env.AWS_ACCESS_KEY_ID = "AKIA";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.HTTP_SMS_URL = "https://sms.example";
    process.env.HTTP_SMS_API_KEY = "k";
    process.env.HTTP_SMS_AUTH_HEADER = "X-Key";
    const config = loadConfig();
    expect(config.twilio).toEqual({
      accountSid: "ACtest",
      authToken: "token",
      from: "+15551234567",
    });
    expect(config.smtp.host).toBe("smtp.example");
    expect(config.smtp.port).toBe(465);
    expect(config.awsSns.accessKeyId).toBe("AKIA");
    expect(config.httpSms.url).toBe("https://sms.example");
    expect(config.httpSms.authHeader).toBe("X-Key");
  });

  it("loads MESSAGE_TEMPLATES_JSON and legacy EN/ES templates", () => {
    process.env.MESSAGE_TEMPLATES_JSON = JSON.stringify([
      { id: "pt", label: "Português", body: "Oi {santa}" },
      {},
    ]);
    const fromJson = loadConfig().messages;
    expect(fromJson[0]?.id).toBe("pt");
    expect(fromJson[1]?.id).toBe("msg-2");
    expect(fromJson[1]?.label).toBe("Message");
    expect(fromJson[1]?.body).toBe("");

    process.env.MESSAGE_TEMPLATES_JSON = "[]";
    process.env.MESSAGE_TEMPLATE_EN = "Hello {santa}";
    delete process.env.MESSAGE_TEMPLATE_ES;
    expect(loadConfig().messages.map((m) => m.id)).toEqual(["en"]);

    delete process.env.MESSAGE_TEMPLATES_JSON;
    delete process.env.MESSAGE_TEMPLATE_EN;
    process.env.MESSAGE_TEMPLATE_ES = "Hola {santa}";
    expect(loadConfig().messages.map((m) => m.id)).toEqual(["es"]);

    process.env.MESSAGE_TEMPLATE_EN = "Hello {santa}";
    process.env.MESSAGE_TEMPLATE_ES = "Hola {santa}";
    expect(loadConfig().messages.map((m) => m.id)).toEqual(["en", "es"]);

    process.env.MESSAGE_TEMPLATES_JSON = "{not-json";
    delete process.env.MESSAGE_TEMPLATE_EN;
    delete process.env.MESSAGE_TEMPLATE_ES;
    expect(loadConfig().messages.length).toBeGreaterThan(0);
  });

  it("parses provider-specific env and contact modes", () => {
    process.env.NOTIFY_PROVIDER = "smtp";
    process.env.SMTP_SECURE = "yes";
    process.env.PORT = "3099";
    process.env.GIFT_BUDGET = "$40";
    process.env.EVENT_DATE = "Jan 1";
    process.env.EVENT_LABEL = "Party";
    process.env.AWS_SNS_REGION = "us-west-2";
    process.env.AWS_SNS_SENDER_ID = "SANTA";
    process.env.MUSEUM_MODE = "0";
    expect(loadConfig().contactMode).toBe("email");
    expect(loadConfig().smtp.secure).toBe(true);
    expect(loadConfig().port).toBe(3099);
    expect(loadConfig().giftBudget).toBe("$40");
    expect(loadConfig().eventDate).toBe("Jan 1");
    expect(loadConfig().eventLabel).toBe("Party");
    expect(loadConfig().awsSns.region).toBe("us-west-2");
    expect(loadConfig().awsSns.senderId).toBe("SANTA");
    expect(loadConfig().museumMode).toBe(false);

    process.env.NOTIFY_PROVIDER = "twilio";
    process.env.AWS_REGION = "eu-west-1";
    delete process.env.AWS_SNS_REGION;
    expect(loadConfig().contactMode).toBe("phone");
    expect(loadConfig().awsSns.region).toBe("eu-west-1");
  });
});

describe("assertProviderReady", () => {
  it("skips checks for museum and stub", () => {
    expect(() => assertProviderReady(testConfig({ museumMode: true }))).not.toThrow();
    expect(() => assertProviderReady(testConfig())).not.toThrow();
  });

  it("requires credentials per provider", () => {
    expect(() =>
      assertProviderReady(testConfig({ notifyProvider: "twilio" })),
    ).toThrow(/Twilio/);
    expect(() =>
      assertProviderReady(
        testConfig({
          notifyProvider: "twilio",
          twilio: {
            accountSid: "ACxx",
            authToken: "tok",
            from: "+15551234567",
          },
        }),
      ),
    ).not.toThrow();

    expect(() =>
      assertProviderReady(testConfig({ notifyProvider: "smtp" })),
    ).toThrow(/SMTP/);
    expect(() =>
      assertProviderReady(
        testConfig({
          notifyProvider: "smtp",
          smtp: {
            host: "smtp.example",
            port: 587,
            secure: false,
            user: "",
            pass: "",
            from: "santa@example.com",
          },
        }),
      ),
    ).not.toThrow();

    expect(() =>
      assertProviderReady(testConfig({ notifyProvider: "aws_sns" })),
    ).toThrow(/AWS SNS/);
    expect(() =>
      assertProviderReady(
        testConfig({
          notifyProvider: "aws_sns",
          awsSns: {
            region: "us-east-1",
            accessKeyId: "AKIA",
            secretAccessKey: "secret",
          },
        }),
      ),
    ).not.toThrow();

    expect(() =>
      assertProviderReady(testConfig({ notifyProvider: "http_sms" })),
    ).toThrow(/HTTP_SMS_URL/);
    expect(() =>
      assertProviderReady(
        testConfig({
          notifyProvider: "http_sms",
          httpSms: {
            url: "https://sms.example/send",
            apiKey: "k",
            authHeader: "Authorization",
          },
        }),
      ),
    ).not.toThrow();

    // Exhaustiveness default (defensive for future provider ids).
    expect(() =>
      assertProviderReady(
        testConfig({
          notifyProvider: "future" as unknown as "stub",
          museumMode: false,
        }),
      ),
    ).not.toThrow();
  });
});
