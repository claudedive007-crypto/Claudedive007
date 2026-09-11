import express from "express";
import cors from "cors";
import { api } from "./routes/api.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(api);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Consentia backend listening on :${port}`);
});
