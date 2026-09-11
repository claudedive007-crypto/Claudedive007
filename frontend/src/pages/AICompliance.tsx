import { IllustrativeNote } from "../components/ui";

export default function AICompliance() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>AI Compliance</h1>
          <div className="sub">The night-shift analyst — flags the strange things a person would miss. It proposes; a human always decides.</div>
        </div>
      </div>
      <IllustrativeNote />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="rowb" style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "var(--red-lt)", borderRadius: 9, marginBottom: 8 }}>
          <span>84,000 profiles pulled at 02:14 (42× baseline)</span>
          <span className="badge red">anomaly</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "var(--amber-lt)", borderRadius: 9 }}>
          <span>Branch BLR-04 · 18s average consent capture</span>
          <span className="badge amber">notice unread</span>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Ask a question about platform data</h3>
        <input placeholder="e.g. Which branches average under 20 seconds per consent?" style={{ height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 11px", width: "100%" }} />
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>Answers strictly from platform data, citing the records used — never autonomous action.</div>
      </div>
    </div>
  );
}
