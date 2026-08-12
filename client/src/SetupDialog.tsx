import { useEffect, useId, useRef, useState } from "react";
import type { PublicConfig } from "../../shared/types";

export type SetupTab = "use" | "send";

type ProviderGuide = {
  id: string;
  title: string;
  contact: string;
  blurb: string;
  env: string;
};

const PROVIDERS: ProviderGuide[] = [
  {
    id: "twilio",
    title: "Twilio SMS",
    contact: "10-digit phone",
    blurb: "Most common path for texting each santa their recipient.",
    env: `NOTIFY_PROVIDER=twilio
MUSEUM_MODE=false
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15551234567`,
  },
  {
    id: "smtp",
    title: "Email (SMTP)",
    contact: "email",
    blurb: "Sends through any SMTP host (Gmail app password, SES, Mailgun, etc.).",
    env: `NOTIFY_PROVIDER=smtp
MUSEUM_MODE=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASS=your_password
SMTP_FROM="Secret Santa <you@example.com>"`,
  },
  {
    id: "aws_sns",
    title: "AWS SNS SMS",
    contact: "10-digit phone",
    blurb: "Uses SNS Publish in your AWS account.",
    env: `NOTIFY_PROVIDER=aws_sns
MUSEUM_MODE=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# optional:
# AWS_SNS_SENDER_ID=Santa`,
  },
  {
    id: "http_sms",
    title: "Generic HTTP SMS",
    contact: "10-digit phone",
    blurb: "POSTs JSON to your gateway URL (openSMS-style and similar).",
    env: `NOTIFY_PROVIDER=http_sms
MUSEUM_MODE=false
HTTP_SMS_URL=https://sms.example.com/send
HTTP_SMS_API_KEY=your_key
HTTP_SMS_AUTH_HEADER=Authorization`,
  },
  {
    id: "stub",
    title: "Stub (no real send)",
    contact: "phone or email",
    blurb: "Logs and previews only. Safe default for demos and local dry runs.",
    env: `NOTIFY_PROVIDER=stub
MUSEUM_MODE=false`,
  },
];

type Props = {
  open: boolean;
  tab: SetupTab;
  config: PublicConfig | null;
  onTabChange: (tab: SetupTab) => void;
  onClose: () => void;
};

export function SetupDialog({ open, tab, config, onTabChange, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [providerId, setProviderId] = useState("twilio");
  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0]!;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !config) return;
    if (config.notifyProvider && PROVIDERS.some((p) => p.id === config.notifyProvider)) {
      setProviderId(config.notifyProvider);
    }
  }, [open, config]);

  if (!open) return null;

  const live =
    config && !config.museumMode && config.notifyProvider !== "stub"
      ? `This instance is live on ${config.notifyProvider} (${config.contactMode} contacts).`
      : config?.museumMode
        ? "This museum demo stubs every delivery. Nothing leaves the building."
        : `This instance is on ${config?.notifyProvider ?? "stub"} - no real SMS or email yet.`;

  return (
    <div className="dialog-root" role="presentation">
      <button
        type="button"
        className="dialog-backdrop"
        aria-label="Close setup guide"
        onClick={onClose}
      />
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog-header">
          <div>
            <p className="dialog-kicker">Setup guide</p>
            <h2 id={titleId}>Run it the way you mean</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost dialog-close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="dialog-tabs" role="tablist" aria-label="Setup topics">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "use"}
            className={tab === "use" ? "dialog-tab active" : "dialog-tab"}
            onClick={() => onTabChange("use")}
          >
            How to use
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "send"}
            className={tab === "send" ? "dialog-tab active" : "dialog-tab"}
            onClick={() => onTabChange("send")}
          >
            Send for real
          </button>
        </div>

        <div className="dialog-body" role="tabpanel">
          {tab === "use" ? (
            <ol className="setup-steps">
              <li>
                <strong>Host controls.</strong> Set the event name, budget, meet date,
                and the language catalog. Each message can use{" "}
                <code>{"{santa}"}</code>, <code>{"{recipient}"}</code>,{" "}
                <code>{"{budget}"}</code>, <code>{"{date}"}</code>,{" "}
                <code>{"{event}"}</code>.
              </li>
              <li>
                <strong>Add to the hat.</strong> Need at least 3 people. Pick which
                languages they receive, then choose <em>Reveal</em> (on this screen) or{" "}
                <em>Send</em> (notify them).
              </li>
              <li>
                <strong>Start Pairing.</strong> One button shuffles everyone, notifies
                Send people, and opens the private reveal line for Reveal people.
              </li>
              <li>
                <strong>Private reveal.</strong> Call one person up. They press and hold
                to peek, release to hide, then tap next when memorized. The host never
                needs to read names aloud.
              </li>
            </ol>
          ) : (
            <div className="setup-send">
              <p className="setup-status" role="status">
                {live}
              </p>
              <p>
                Real deliveries are configured on the server with a <code>.env</code>{" "}
                file (see <code>example.env</code>), then restart the app. Credentials
                stay off this page on purpose.
              </p>
              <ol className="setup-steps">
                <li>
                  Copy <code>example.env</code> to <code>.env</code> next to the app.
                </li>
                <li>
                  Set <code>MUSEUM_MODE=false</code> and pick a provider below.
                </li>
                <li>Fill that provider&apos;s credentials, then restart.</li>
                <li>
                  Add people with the contact field that provider needs, mark them{" "}
                  <em>Send</em>, and hit <strong>Start Pairing</strong>.
                </li>
              </ol>

              <label className="setup-provider-pick">
                Provider recipe
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="setup-provider-blurb">
                {provider.blurb} Needs <strong>{provider.contact}</strong> on each
                Send person.
              </p>
              <pre className="setup-env">{provider.env}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
