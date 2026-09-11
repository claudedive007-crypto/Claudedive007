import { useEffect, useState } from "react";
import { subscribe, type Toast } from "../lib/toast";

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => subscribe(setItems), []);
  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === "ok" ? "ok" : t.kind === "bad" ? "bad" : ""}`}>
          <b>{t.title}</b>
          {t.body}
        </div>
      ))}
    </div>
  );
}
