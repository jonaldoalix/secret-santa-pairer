import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AssignResult,
  MessageBlock,
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
  messages: MessageBlock[];
};

function draftFromConfig(cfg: PublicConfig): SettingsDraft {
  return {
    giftBudget: cfg.giftBudget,
    eventDate: cfg.eventDate,
    eventLabel: cfg.eventLabel,
    messages: cfg.messages.map((m) => ({ ...m })),
  };
}

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function labelsFor(participant: Participant, messages: MessageBlock[]): string {
  const map = new Map(messages.map((m) => [m.id, m.label]));
  return participant.languageIds.map((id) => map.get(id) || id).join(", ");
}

export function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [settings, setSettings] = useState<SettingsDraft | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AssignResult | null>(null);

  const ready = participants.length >= 3;
  const availableMessages = settings?.messages ?? config?.messages ?? [];

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
        setLanguageIds(cfg.messages.map((m) => m.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app.");
      }
    })();
  }, []);

  function updateMessage(index: number, patch: Partial<MessageBlock>) {
    if (!settings) return;
    const messages = settings.messages.map((m, i) =>
      i === index ? { ...m, ...patch } : m,
    );
    setSettings({ ...settings, messages });
  }

  function addMessage() {
    if (!settings) return;
    if (settings.messages.length >= 8) return;
    const id = newMessageId();
    setSettings({
      ...settings,
      messages: [
        ...settings.messages,
        {
          id,
          label: `Language ${settings.messages.length + 1}`,
          body: "Hello {santa}! Your recipient is {recipient}. Budget {budget}. See you {date}!",
        },
      ],
    });
    setLanguageIds((prev) => [...prev, id]);
  }

  function removeMessage(index: number) {
    if (!settings || settings.messages.length <= 1) return;
    const removed = settings.messages[index];
    const messages = settings.messages.filter((_, i) => i !== index);
    setSettings({ ...settings, messages });
    if (removed) {
      setLanguageIds((prev) => prev.filter((id) => id !== removed.id));
    }
  }

  function toggleDraftLanguage(id: string) {
    setLanguageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

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
      const valid = new Set(cfg.messages.map((m) => m.id));
      setLanguageIds((prev) => {
        const next = prev.filter((id) => valid.has(id));
        return next.length > 0 ? next : cfg.messages.map((m) => m.id);
      });
      const list = await api<{ participants: Participant[] }>("/participants");
      setParticipants(list.participants);
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
    if (languageIds.length === 0) {
      setError("Pick at least one language for this person.");
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ participants: Participant[] }>("/participants", {
        method: "POST",
        body: JSON.stringify({ name, phone, email, languageIds }),
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

  async function onToggleParticipantLanguage(participant: Participant, languageId: string) {
    const next = participant.languageIds.includes(languageId)
      ? participant.languageIds.filter((id) => id !== languageId)
      : [...participant.languageIds, languageId];
    if (next.length === 0) {
      setError(`${participant.name} needs at least one language.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ participants: Participant[] }>(
        `/participants/${participant.id}/languages`,
        {
          method: "PATCH",
          body: JSON.stringify({ languageIds: next }),
        },
      );
      setParticipants(data.participants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update languages.");
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
              {availableMessages.map((m) => (
                <span className="chip" key={m.id}>
                  {m.label}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {settings ? (
          <section className="panel" aria-labelledby="settings-heading">
            <h2 id="settings-heading">Host controls</h2>
            <p className="panel-intro">
              Define the language catalog here. Each participant later picks which of
              these they should receive. Placeholders: <code>{"{santa}"}</code>,{" "}
              <code>{"{recipient}"}</code>, <code>{"{budget}"}</code>,{" "}
              <code>{"{date}"}</code>, <code>{"{event}"}</code>.
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
              <label style={{ gridColumn: "1 / -1" }}>
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

              {settings.messages.map((message, index) => (
                <div className="message-block" key={message.id}>
                  <label>
                    Language label
                    <input
                      value={message.label}
                      onChange={(e) => updateMessage(index, { label: e.target.value })}
                      placeholder="Português"
                      required
                    />
                  </label>
                  <label>
                    Message body
                    <textarea
                      value={message.body}
                      onChange={(e) => updateMessage(index, { body: e.target.value })}
                      required
                    />
                  </label>
                  {settings.messages.length > 1 ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => removeMessage(index)}
                    >
                      Remove this language
                    </button>
                  ) : null}
                </div>
              ))}

              <div className="actions" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={busy || settings.messages.length >= 8}
                  onClick={addMessage}
                >
                  Add another language
                </button>
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  Save event settings
                </button>
              </div>
            </form>
            <p className="template-hint">
              Participants only get the languages you check for them — nothing else.
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

            <fieldset className="lang-fieldset">
              <legend>Languages to receive</legend>
              <div className="lang-options">
                {availableMessages.map((m) => (
                  <label key={m.id} className="lang-option">
                    <input
                      type="checkbox"
                      checked={languageIds.includes(m.id)}
                      onChange={() => toggleDraftLanguage(m.id)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

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
                    <span className="lang-summary">
                      Receives: {labelsFor(p, availableMessages) || "none"}
                    </span>
                    <div className="lang-options compact">
                      {availableMessages.map((m) => (
                        <label key={`${p.id}-${m.id}`} className="lang-option">
                          <input
                            type="checkbox"
                            checked={p.languageIds.includes(m.id)}
                            disabled={busy}
                            onChange={() => void onToggleParticipantLanguage(p, m.id)}
                          />
                          <span>{m.label}</span>
                        </label>
                      ))}
                    </div>
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
