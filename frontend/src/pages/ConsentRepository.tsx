import { useEffect, useMemo, useState } from "react";
import { api, type ConsentEvent, type Customer } from "../lib/api";
import { fmtDateTime } from "../components/ui";

export default function ConsentRepository() {
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Customer & { consentEvents: ConsentEvent[] }) | null>(null);

  useEffect(() => {
    api.consentEvents(200).then(setEvents);
  }, []);

  useEffect(() => {
    if (!selected) return setDetail(null);
    api.customerConsents(selected).then((d) => setDetail(d as any));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.customer.displayName.toLowerCase().includes(q) || e.customer.externalRef.toLowerCase().includes(q) || e.purpose.name.toLowerCase().includes(q));
  }, [events, query]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Consent Repository</h1>
          <div className="sub">The filing cabinet that cannot be edited. Every event is appended, never overwritten — current state is derived from the top of the stack.</div>
        </div>
        <div className="acts">
          <input placeholder="Search customer or purpose…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ height: 34, borderRadius: 8, border: "1px solid var(--line)", padding: "0 11px", width: 260 }} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selected ? "1.4fr 1fr" : "1fr" }}>
        <div className="card">
          <table className="t">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Purpose</th>
                <th>Event</th>
                <th>Channel</th>
                <th>Notice</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} onClick={() => setSelected(e.customer.externalRef)} style={{ cursor: "pointer" }}>
                  <td>
                    <b>{e.customer.displayName}</b>
                    <div className="muted mono" style={{ fontSize: 10.5 }}>{e.customer.externalRef}</div>
                  </td>
                  <td>{e.purpose.name}</td>
                  <td>
                    <span className={`badge ${e.action === "WITHDRAW" ? "red" : "green"}`}>{e.action.toLowerCase()}</span>
                  </td>
                  <td className="muted">{e.channel.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="mono muted">{e.noticeVersion}</td>
                  <td className="muted">{fmtDateTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty">No matching consent events.</div>}
        </div>

        {selected && detail && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3>{detail.displayName}</h3>
                <div className="muted mono" style={{ fontSize: 11 }}>{detail.externalRef}</div>
              </div>
              <button className="btn sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 8 }}>Event timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {detail.consentEvents.map((e, i) => (
                <div key={e.id} style={{ display: "flex", gap: 10, paddingBottom: 14, position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 9, height: 9, borderRadius: 99, background: e.action === "WITHDRAW" ? "var(--red)" : "var(--green)", flexShrink: 0 }} />
                    {i < detail.consentEvents.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--line)", marginTop: 2 }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--ink)" }}>
                      {e.action === "WITHDRAW" ? "Withdrawn" : "Granted"} — {e.purpose.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtDateTime(e.createdAt)} · {e.channel.replace(/_/g, " ").toLowerCase()} · notice {e.noticeVersion}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--blue-dk)" }}>receipt: {e.receiptId}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
