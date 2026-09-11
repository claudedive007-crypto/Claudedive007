import { useEffect, useState } from "react";
import { api, type DriveT, type Purpose } from "../lib/api";
import { toast } from "../lib/toast";
import { StatusBadge, fmtDate } from "../components/ui";

export default function ConsentDrives() {
  const [drives, setDrives] = useState<DriveT[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [purposeCode, setPurposeCode] = useState("");
  const [audience, setAudience] = useState("Existing customers");
  const [channels, setChannels] = useState<Set<string>>(new Set(["WHATSAPP"]));

  function refresh() {
    api.drives().then(setDrives);
  }
  useEffect(() => {
    refresh();
    api.purposes().then((p) => {
      const consentOnly = p.filter((x) => x.legalBasis === "CONSENT");
      setPurposes(consentOnly);
      setPurposeCode(consentOnly[0]?.code ?? "");
    });
  }, []);

  async function create() {
    if (!name || !purposeCode || channels.size === 0) return toast("Missing fields", "Name, purpose and at least one channel are required", "bad");
    await api.createDrive({ name, purpose: purposeCode, audience, channels: Array.from(channels) });
    toast("Drive launched", name, "ok");
    setCreating(false);
    setName("");
    refresh();
  }

  async function act(id: string, action: "pause" | "resume" | "cancel") {
    await api.driveAction(id, action);
    refresh();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Consent Drives</h1>
          <div className="sub">A compliance tool for asking a group of customers for consent — not a marketing campaign tool.</div>
        </div>
        <div className="acts">
          <button className="btn primary" onClick={() => setCreating(true)}>
            + New drive
          </button>
        </div>
      </div>

      {creating && (
        <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>New drive</h3>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing renewal — Q4" />
          </div>
          <div className="field">
            <label>Purpose</label>
            <select value={purposeCode} onChange={(e) => setPurposeCode(e.target.value)}>
              {purposes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Audience</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div className="field">
            <label>Channels</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["WHATSAPP", "EMAIL_LINK", "MOBILE_APP"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn sm"
                  style={channels.has(c) ? { background: "var(--blue-lt)", borderColor: "#CBDCF3", color: "var(--blue-dk)" } : {}}
                  onClick={() =>
                    setChannels((prev) => {
                      const next = new Set(prev);
                      next.has(c) ? next.delete(c) : next.add(c);
                      return next;
                    })
                  }
                >
                  {c.replace(/_/g, " ").toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" onClick={create}>
              Launch now
            </button>
            <button className="btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {drives.map((d) => (
          <div key={d.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {d.purpose.name} · {d.audience}
                </div>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="stat-tile">
                <div className="v" style={{ fontSize: 16 }}>{d.targeted.toLocaleString()}</div>
                <div className="k">targeted</div>
              </div>
              <div className="stat-tile">
                <div className="v" style={{ fontSize: 16 }}>{d.responses.toLocaleString()}</div>
                <div className="k">responded ({d.targeted ? Math.round((d.responses / d.targeted) * 100) : 0}%)</div>
              </div>
              <div className="stat-tile">
                <div className="v" style={{ fontSize: 16, color: "var(--green)" }}>{d.approved.toLocaleString()}</div>
                <div className="k">approved</div>
              </div>
              <div className="stat-tile">
                <div className="v" style={{ fontSize: 16, color: "var(--red)" }}>{d.rejected.toLocaleString()}</div>
                <div className="k">rejected</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 10 }}>Created {fmtDate(d.createdAt)} · {d.channels.join(", ").toLowerCase()}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {d.status === "ACTIVE" && (
                <button className="btn sm" onClick={() => act(d.id, "pause")}>
                  Pause
                </button>
              )}
              {d.status === "SCHEDULED" && (
                <button className="btn sm" onClick={() => act(d.id, "resume")}>
                  Resume
                </button>
              )}
              {d.status !== "CANCELLED" && d.status !== "COMPLETED" && (
                <button className="btn sm" onClick={() => act(d.id, "cancel")}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {drives.length === 0 && <div className="empty">No drives yet.</div>}
      </div>
    </div>
  );
}
