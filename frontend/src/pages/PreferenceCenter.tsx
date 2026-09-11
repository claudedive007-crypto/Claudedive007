import { useEffect, useState } from "react";
import { api, type Customer, type ConsentState, type Purpose } from "../lib/api";
import { toast } from "../lib/toast";

export default function PreferenceCenter() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [customerRef, setCustomerRef] = useState("CUS-2048");
  const [states, setStates] = useState<ConsentState[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.customers().then((c) => setCustomers(c.filter((x) => x.externalRef !== "UNKNOWN")));
    api.purposes().then(setPurposes);
  }, []);

  function loadStates() {
    if (!customerRef) return;
    api.customerConsents(customerRef).then((c) => setStates((c as any).consentStates));
  }
  useEffect(loadStates, [customerRef]);

  const customer = customers.find((c) => c.externalRef === customerRef);

  function statusFor(code: string) {
    const purpose = purposes.find((p) => p.code === code);
    if (!purpose) return null;
    return states.find((s) => s.purpose.code === code) ?? null;
  }

  async function toggle(code: string, isOn: boolean) {
    setBusy(code);
    try {
      if (isOn) {
        await api.withdraw({ customer_ref: customerRef, purpose: code, actor: `${customer?.displayName} (self-service)` });
        toast("Consent withdrawn", code, "ok");
      } else {
        await api.capture({ customer_ref: customerRef, purpose: code, channel: "PREFERENCE_CENTER", notice_version: "v4.2", language: customer?.preferredLanguage ?? "en", verification_method: "session" });
        toast("Consent granted", code, "ok");
      }
      loadStates();
    } finally {
      setBusy(null);
    }
  }

  const consentPurposes = purposes.filter((p) => p.legalBasis === "CONSENT");
  const infoPurposes = purposes.filter((p) => p.legalBasis !== "CONSENT");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Preference Center</h1>
          <div className="sub">The only screen your customer ever sees. A toggle here writes the same grant/withdraw event as any other channel.</div>
        </div>
        <div className="acts">
          <select value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} style={{ height: 34, borderRadius: 8, border: "1px solid var(--line)", padding: "0 10px" }}>
            {customers.map((c) => (
              <option key={c.id} value={c.externalRef}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ background: "var(--navy)", borderRadius: 20, padding: 8, width: 300, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 15, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,var(--blue),#1550B8)", padding: 16, color: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Meridian Bank</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>Your privacy choices · notice v4.2</div>
            </div>
            <div style={{ padding: 14 }}>
              {infoPurposes.map((p) => (
                <div key={p.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
                  <div style={{ fontSize: 12 }}>
                    {p.name}
                    <div style={{ fontSize: 9.5, color: "var(--ink-4)" }}>required · {p.legalBasis === "LEGAL_OBLIGATION" ? "legal duty" : "contract"}</div>
                  </div>
                  <button className="tgl on locked" />
                </div>
              ))}
              {consentPurposes.map((p) => {
                const state = statusFor(p.code);
                const isOn = state?.status === "VALID";
                return (
                  <div key={p.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
                    <div style={{ fontSize: 12 }}>{p.name}</div>
                    <button className={`tgl${isOn ? " on" : ""}`} disabled={busy === p.code} onClick={() => toggle(p.code, isOn)} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ marginBottom: 8 }}>{customer?.displayName}'s brand, their language, their phone</h3>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
            The top switches are informational and locked — account servicing and KYC run on legal duty, not consent, so they can never be turned off from
            here. Every other switch is a real grant/withdraw call against the same Validation Engine the rest of the platform enforces.
          </p>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 6 }}>Embed snippet</div>
          <pre className="mono" style={{ background: "var(--navy)", color: "#CBDCF3", padding: 12, borderRadius: 9, fontSize: 11, overflowX: "auto" }}>
{`<script src="https://cdn.consentia.io/pc.js"
  data-customer="${customerRef}"></script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
