import { IllustrativeNote } from "../components/ui";

const RULES = [
  { event: "DSR near SLA", threshold: "< 72 hours", who: "DPO", how: "Slack + email" },
  { event: "DLQ entry aged", threshold: "> 4 hours", who: "Connector owner", how: "Email" },
  { event: "Chain verification failure", threshold: "any", who: "DPO + CISO", how: "Slack + SMS" },
];
const LOG = [
  { t: "SLA warning — DSR-4310 due in 4 days", ch: "Email", to: "Ananya Rao (DPO)", when: "5 hrs ago", sev: "amber" },
  { t: "3 erasure requests near SLA", ch: "Slack", to: "Ananya Rao (DPO)", when: "Today", sev: "red" },
  { t: "CloudMailer DPA expired", ch: "Email", to: "Vikram Menon (CISO)", when: "2 days ago", sev: "red" },
];

export default function Notifications() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <div className="sub">The alarm system — decides who gets told what, and how loudly.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Rules</h3>
          <table className="t">
            <thead>
              <tr>
                <th>Event</th>
                <th>Threshold</th>
                <th>Audience</th>
                <th>Channel</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.event}>
                  <td>{r.event}</td>
                  <td className="mono muted">{r.threshold}</td>
                  <td>{r.who}</td>
                  <td className="muted">{r.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Delivery log</h3>
          {LOG.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line-2)", fontSize: 12.5 }}>
              <div>
                <span className={`badge ${l.sev}`} style={{ marginRight: 8 }}>
                  {l.ch}
                </span>
                {l.t}
              </div>
              <span className="muted">{l.when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
