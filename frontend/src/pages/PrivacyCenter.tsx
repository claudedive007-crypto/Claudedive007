import { useEffect, useState } from "react";
import { api, type Customer, type DSR } from "../lib/api";
import { StatusBadge, fmtDate } from "../components/ui";
import { toast } from "../lib/toast";

const TYPES: DSR["type"][] = ["ACCESS", "CORRECTION", "ERASURE", "GRIEVANCE", "NOMINATION"];

export default function PrivacyCenter() {
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerRef, setCustomerRef] = useState("");
  const [type, setType] = useState<DSR["type"]>("ACCESS");

  function refresh() {
    api.dsrList().then(setDsrs);
  }
  useEffect(() => {
    refresh();
    api.customers().then((c) => {
      const real = c.filter((x) => x.externalRef !== "UNKNOWN");
      setCustomers(real);
      setCustomerRef(real[0]?.externalRef ?? "");
    });
  }, []);

  async function open() {
    if (!customerRef) return;
    await api.createDsr({ customer_ref: customerRef, type });
    toast("Rights request opened", `${type} for ${customers.find((c) => c.externalRef === customerRef)?.displayName}`, "ok");
    refresh();
  }

  function daysLeft(dueAt: string) {
    return Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Privacy Center</h1>
          <div className="sub">The requests desk. Every rights exercise lands here with a clock ticking against the configured response window.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Open a new request</h3>
        <div className="grid grid-3">
          <div className="field">
            <label>Customer</label>
            <select value={customerRef} onChange={(e) => setCustomerRef(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.externalRef}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as DSR["type"])}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn primary" onClick={open}>
          Open request
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Queue</h3>
        <table className="t">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Type</th>
              <th>Status</th>
              <th>Due</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {dsrs.map((d) => {
              const left = daysLeft(d.dueAt);
              return (
                <tr key={d.id}>
                  <td>{d.customer.displayName}</td>
                  <td>{d.type.toLowerCase()}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="muted">{fmtDate(d.dueAt)}</td>
                  <td>
                    <span className={`badge ${left < 3 ? "red" : left < 7 ? "amber" : "green"}`}>{left} days left</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {dsrs.length === 0 && <div className="empty">No open requests.</div>}
      </div>
    </div>
  );
}
