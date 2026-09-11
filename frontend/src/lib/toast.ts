export type Toast = { id: number; title: string; body?: string; kind: "ok" | "bad" | "info" };

type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  listeners.forEach((l) => l(toasts));
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function toast(title: string, body?: string, kind: Toast["kind"] = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, title, body, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4200);
}
