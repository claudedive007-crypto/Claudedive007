import { IllustrativeNote } from "../components/ui";

export default function BreachResponse() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Breach Response</h1>
          <div className="sub">A breach is a reporting event with a clock on it. The platform assembles; a named human signs before filing.</div>
        </div>
        <div className="acts">
          <button className="btn danger">Open incident</button>
        </div>
      </div>
      <IllustrativeNote />
      <div className="card" style={{ marginBottom: 16, background: "var(--red-lt)", borderColor: "#F3C9CF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⏱</span>
          <div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--red)" }}>41:18:32</div>
            <div className="muted" style={{ fontSize: 12 }}>until the reporting window closes</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>1. Who was affected? <b>12,480</b> — computed from the evidence vault, not a guess</div>
          <div>2. Notices drafted in 9 languages</div>
          <div style={{ borderLeft: "3px solid var(--red)", paddingLeft: 10 }}>
            3. <b>Human signs before filing</b> — Ananya Rao, DPO
          </div>
        </div>
      </div>
    </div>
  );
}
