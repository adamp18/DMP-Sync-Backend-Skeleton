import { Router, type IRouter } from "express";
import authRoutes from "./auth.js";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.use("/auth", authRoutes);

export default router;
