import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AssignResult,
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

export function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignResult | null>(null);

  const evenReady = participants.length >= 2 && participants.length % 2 === 0;

  const contactHint = useMemo(() => {
    if (!config) return "";
    if (config.contactMode === "email") return "Email required for SMTP notify.";
    if (config.contactMode === "phone") return "Phone required for SMS notify.";
    return "Phone or email is enough in museum/stub mode.";
  }, [config]);

  useEffect(() => {
    void (async () => {
      try {
        const [cfg, list] = await Promise.all([
          api<PublicConfig>("/config"),
          api<{ participants: Participant[] }>("/participants"),
        ]);
        setConfig(cfg);
        setParticipants(list.participants);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app.");
      }
    })();
  }, []);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
    if (!evenReady) {
      setError("Add an even number of participants (at least 2) before notifying.");
      return;
    }
    const confirmed = window.confirm(
      config?.museumMode
        ? "Shuffle and preview stub notifications for everyone?"
        : "Shuffle and send private notifications to every participant now?",
    );
    if (!confirmed) return;

    setError(null);
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
          <p className="sr-only">Secret Santa Pairer</p>
          <h1 className="brand">Secret Santa Pairer</h1>
          <p className="lede">
            Collect your group, shuffle like names in a hat, and privately notify each
            person of their recipient — even when you cannot gather in person.
          </p>
          {config ? (
            <div className="meta" aria-label="Event settings">
              <span className="chip">{config.eventLabel}</span>
              <span className="chip">Budget {config.giftBudget}</span>
              <span className="chip">{config.eventDate}</span>
              <span className="chip">Notify: {config.notifyProvider}</span>
              <span className="chip">Locale: {config.messageLocale}</span>
            </div>
          ) : null}
        </header>

        <section className="panel" aria-labelledby="add-heading">
          <h2 id="add-heading">Add participants</h2>
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
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0100"
                  inputMode="tel"
                  autoComplete="tel"
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
                Add participant
              </button>
            </div>
          </form>
          <p className="hint">{contactHint}</p>
        </section>

        <section className="panel" aria-labelledby="list-heading">
          <h2 id="list-heading">
            Participants ({participants.length})
            {!evenReady && participants.length > 0 ? " — need an even count" : ""}
          </h2>

          {participants.length === 0 ? (
            <p className="empty">No one yet. Add an even number of people to begin.</p>
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
              disabled={busy || !evenReady}
              onClick={() => void onAssign()}
            >
              {config?.museumMode ? "Shuffle & preview" : "Shuffle & notify"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => void onReset()}
            >
              {config?.museumMode ? "Reset demo roster" : "Clear all"}
            </button>
          </div>

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
