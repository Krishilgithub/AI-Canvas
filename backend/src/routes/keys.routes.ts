import { Router } from "express";
import { keysController } from "../controllers/keys.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// All keys routes require auth — user_id comes from JWT, not request body
router.post("/save", requireAuth, keysController.saveKey);
router.get("/status", requireAuth, keysController.getStatus);
router.delete("/remove", requireAuth, keysController.removeKey);
router.post("/preferred-model", requireAuth, keysController.setPreferredModel);
router.get("/provider-status", requireAuth, keysController.getProviderStatus);

export default router;
