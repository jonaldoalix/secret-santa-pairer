import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AssignResult,
  MessageLocale,
  Participant,
  PublicConfig,
} from "../../shared/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

type SettingsDraft = {
  giftBudget: string;
  eventDate: string;
  eventLabel: string;
  messageLocale: MessageLocale;
  templateEn: string;
  templateEs: string;
};

function draftFromConfig(cfg: PublicConfig): SettingsDraft {
  return {
    giftBudget: cfg.giftBudget,
    eventDate: cfg.eventDate,
    eventLabel: cfg.eventLabel,
    messageLocale: cfg.messageLocale,
    templateEn: cfg.templateEn,
    templateEs: cfg.templateEs,
  };
}

export function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [settings, setSettings] = useState<SettingsDraft | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AssignResult | null>(null);

  const ready = participants.length >= 3;

  const contactHint = useMemo(() => {
    if (!config) return "";
    if (config.contactMode === "email") return "Email required for SMTP notify.";
    if (config.contactMode === "phone") {
      return "10-digit US/Canada phone required for SMS notify.";
    }
    return "10-digit phone or email works in museum/stub mode.";
  }, [config]);

  useEffect(() => {
    void (async () => {
      try {
        const [cfg, list] = await Promise.all([
          api<PublicConfig>("/config"),
          api<{ participants: Participant[] }>("/participants"),
        ]);
        setConfig(cfg);
        setSettings(draftFromConfig(cfg));
        setParticipants(list.participants);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app.");
      }
    })();
  }, []);

  async function onSaveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const cfg = await api<PublicConfig>("/config", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setConfig(cfg);
      setSettings(draftFromConfig(cfg));
      setNotice("Event settings saved for this session.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setResult(null);
    setBusy(true);
    try {
      const data = await api<{ participants: Participant[] }>("/participants", {
        method: "POST",
        body: JSON.stringify({ name, phone, email }),
      });
      setParticipants(data.participants);
      setName("");
      setPhone("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add participant.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setError(null);
    setNotice(null);
    setResult(null);
    setBusy(true);
    try {
      const data = await api<{ participants: Participant[] }>(`/participants/${id}`, {
        method: "DELETE",
      });
      setParticipants(data.participants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove participant.");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setError(null);
    setNotice(null);
    setResult(null);
    setBusy(true);
    try {
      const data = await api<{ participants: Participant[] }>("/reset", { method: "POST" });
      setParticipants(data.participants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset list.");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign() {
    if (!ready) {
      setError("Add at least 3 participants before notifying.");
      return;
    }
    const confirmed = window.confirm(
      config?.museumMode
        ? "Shuffle and preview stub notifications for everyone?"
        : "Shuffle and send private notifications to every participant now?",
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const data = await api<AssignResult>("/assign", { method: "POST" });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {config?.museumMode ? (
        <div className="museum-banner" role="status">
          <strong>Museum demo</strong>
          <span>
            No real SMS or email is sent. Deliveries are stubbed for evaluation only.
          </span>
        </div>
      ) : null}

      <main className="shell">
        <header className="hero">
          <p className="kicker">Papers in a hat · privately</p>
          <h1 className="brand">Secret Santa Pairer</h1>
          <p className="lede">
            Drop in the crew, give the hat a shake, and send each person their recipient
            without anyone — including you — spoiling the surprise.
          </p>
          {config || settings ? (
            <div className="meta" aria-label="Event settings">
              <span className="chip">{settings?.eventLabel ?? config?.eventLabel}</span>
              <span className="chip">
                Budget {settings?.giftBudget ?? config?.giftBudget}
              </span>
              <span className="chip">{settings?.eventDate ?? config?.eventDate}</span>
              <span className="chip">Notify: {config?.notifyProvider}</span>
              <span className="chip">
                Locale: {settings?.messageLocale ?? config?.messageLocale}
              </span>
            </div>
          ) : null}
        </header>

        {settings ? (
          <section className="panel" aria-labelledby="settings-heading">
            <h2 id="settings-heading">Host controls</h2>
            <p className="panel-intro">
              Tune the event copy for this run. Placeholders:{" "}
              <code>{"{santa}"}</code>, <code>{"{recipient}"}</code>,{" "}
              <code>{"{budget}"}</code>, <code>{"{date}"}</code>, <code>{"{event}"}</code>.
            </p>
            <form className="form-grid two" onSubmit={onSaveSettings}>
              <label>
                Event name
                <input
                  value={settings.eventLabel}
                  onChange={(e) =>
                    setSettings({ ...settings, eventLabel: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Gift budget
                <input
                  value={settings.giftBudget}
                  onChange={(e) =>
                    setSettings({ ...settings, giftBudget: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                When you meet
                <input
                  value={settings.eventDate}
                  onChange={(e) =>
                    setSettings({ ...settings, eventDate: e.target.value })
                  }
                  placeholder="Dec 24"
                  required
                />
              </label>
              <label>
                Message language
                <select
                  value={settings.messageLocale}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      messageLocale: e.target.value as MessageLocale,
                    })
                  }
                >
                  <option value="bilingual">Bilingual EN + ES</option>
                  <option value="en">English only</option>
                  <option value="es">Spanish only</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                English template
                <textarea
                  value={settings.templateEn}
                  onChange={(e) =>
                    setSettings({ ...settings, templateEn: e.target.value })
                  }
                  required
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Spanish template
                <textarea
                  value={settings.templateEs}
                  onChange={(e) =>
                    setSettings({ ...settings, templateEs: e.target.value })
                  }
                  required
                />
              </label>
              <div className="actions" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
                <button className="btn btn-secondary" type="submit" disabled={busy}>
                  Save event settings
                </button>
              </div>
            </form>
            <p className="template-hint">
              Settings apply to this server session (restart resets to .env defaults).
            </p>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="add-heading">
          <h2 id="add-heading">Add to the hat</h2>
          <form className="form-grid two" onSubmit={onAdd}>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Casey"
                autoComplete="name"
                required
              />
            </label>
            {config?.contactMode !== "email" ? (
              <label>
                Phone (10 digits)
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2813308004"
                  inputMode="numeric"
                  autoComplete="tel"
                  pattern="[\d\s()+-]{10,20}"
                  title="Enter a 10-digit phone number"
                  required={config?.contactMode === "phone"}
                />
              </label>
            ) : null}
            {config?.contactMode !== "phone" ? (
              <label>
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="casey@example.com"
                  inputMode="email"
                  autoComplete="email"
                  required={config?.contactMode === "email"}
                />
              </label>
            ) : null}
            <div className="actions" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                Drop in the hat
              </button>
            </div>
          </form>
          <p className="hint">{contactHint}</p>
        </section>

        <section className="panel" aria-labelledby="list-heading">
          <h2 id="list-heading">
            In the hat ({participants.length})
            {!ready && participants.length > 0 ? " — need at least 3" : ""}
          </h2>

          {participants.length === 0 ? (
            <p className="empty">Empty hat. Add at least 3 people to begin.</p>
          ) : (
            <ul className="list">
              {participants.map((p) => (
                <li key={p.id}>
                  <div className="person">
                    <strong>{p.name}</strong>
                    <span>{[p.phone, p.email].filter(Boolean).join(" · ")}</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void onRemove(p.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy || !ready}
              onClick={() => void onAssign()}
            >
              {config?.museumMode ? "Shake & preview" : "Shake & notify"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => void onReset()}
            >
              {config?.museumMode ? "Reset demo roster" : "Empty the hat"}
            </button>
          </div>

          {notice ? (
            <p className="status ok" role="status">
              {notice}
            </p>
          ) : null}

          {error ? (
            <p className="status error" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="status ok" role="status">
              Paired {result.assignmentCount} people via{" "}
              <strong>{config?.notifyProvider}</strong>. Recipient names stay private
              {result.museumMode ? " — stub delivery details below." : "."}
            </div>
          ) : null}

          {result?.museumMode && result.deliveries.length > 0 ? (
            <div className="deliveries" aria-label="Stub deliveries">
              {result.deliveries.map((d) => (
                <article className="delivery" key={`${d.santaId}-${d.to}`}>
                  <strong>
                    {d.santaName} → {d.to}
                  </strong>{" "}
                  <span className="chip">{d.status}</span>
                  <pre>{d.body}</pre>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
