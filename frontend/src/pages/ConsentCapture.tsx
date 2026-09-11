import { useEffect, useState } from "react";
import { api, type Customer, type Purpose } from "../lib/api";
import { toast } from "../lib/toast";

const CHANNELS = ["MOBILE_APP", "WEB", "WHATSAPP", "BRANCH", "CALL_CENTRE", "EMAIL_LINK", "QR", "PARTNER_API"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export default function ConsentCapture() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [step, setStep] = useState(1);
  const [customerRef, setCustomerRef] = useState("");
  const [language, setLanguage] = useState("en");
  const [channel, setChannel] = useState("BRANCH");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [verified, setVerified] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; purposes: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.customers().then((c) => setCustomers(c.filter((x) => x.externalRef !== "UNKNOWN")));
    api.purposes().then((p) => setPurposes(p.filter((x) => x.legalBasis === "CONSENT")));
  }, []);

  const customer = customers.find((c) => c.externalRef === customerRef);

  function togglePurpose(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const results = [];
      for (const code of selected) {
        const r = await api.capture({
          customer_ref: customerRef,
          purpose: code,
          channel,
          notice_version: "v4.2",
          language,
          verification_method: "otp",
        });
        results.push(r.receipt_id);
      }
      setReceipt({ id: results[0] ?? "", purposes: Array.from(selected) });
      setStep(5);
      toast("Consent captured", `${selected.size} purpose(s) recorded for ${customer?.displayName}`, "ok");
    } catch (e) {
      toast("Capture failed", e instanceof Error ? e.message : "Unknown error", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setStep(1);
    setCustomerRef("");
    setSelected(new Set());
    setVerified(false);
    setReceipt(null);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Consent Capture</h1>
          <div className="sub">Eight front doors, one identical record. This form writes real ConsentEvent rows through the same API any channel uses.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {["Identify", "Notice", "Purposes", "Verify", "Receipt"].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: i + 1 <= step ? "var(--blue)" : "var(--line)",
                  marginBottom: 6,
                }}
              />
              <div style={{ fontSize: 10.5, color: i + 1 === step ? "var(--blue-dk)" : "var(--ink-4)", fontWeight: 650 }}>{s}</div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="field">
              <label>Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Customer</label>
              <select value={customerRef} onChange={(e) => setCustomerRef(e.target.value)}>
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.externalRef}>
                    {c.displayName} — {c.externalRef}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primary" disabled={!customerRef} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="field">
              <label>Notice language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, padding: 12, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>
              <b style={{ color: "var(--ink)" }}>Who we are.</b> Meridian Bank Ltd. is the Data Fiduciary for the personal data described below, under
              the Digital Personal Data Protection Act, 2023. Notice version <span className="mono">v4.2</span>.
            </div>
            <button className="btn primary" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>Each purpose is an individual, affirmative choice — no pre-ticked boxes.</div>
            {purposes.map((p) => (
              <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
                <input type="checkbox" checked={selected.has(p.code)} onChange={() => togglePurpose(p.code)} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 650, color: "var(--ink)", fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.description}</div>
                </div>
              </label>
            ))}
            <button className="btn primary" style={{ marginTop: 14 }} disabled={selected.size === 0} onClick={() => setStep(4)}>
              Continue
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>Verify identity by OTP before the consent is recorded.</div>
            <div className="field">
              <label>OTP</label>
              <input placeholder="Enter 6-digit code" defaultValue="482913" onChange={() => setVerified(true)} />
            </div>
            <button className="btn primary" disabled={submitting || !verified} onClick={submit}>
              {submitting ? "Recording…" : "Verify & record consent"}
            </button>
          </div>
        )}

        {step === 5 && receipt && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 99, background: "var(--green-lt)", display: "grid", placeItems: "center", color: "var(--green)", fontSize: 18 }}>✓</div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>Consent receipt issued</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{customer?.displayName} · {receipt.purposes.length} purpose(s)</div>
              </div>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 9, padding: 12, fontSize: 12 }} className="mono">
              receipt_id: {receipt.id}
            </div>
            <button className="btn" style={{ marginTop: 14 }} onClick={restart}>
              Capture another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
