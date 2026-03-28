import { Router } from "express";
import { mediaController } from "../controllers/media.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Upload a new asset (base64 body)
router.post("/upload", requireAuth, mediaController.uploadAsset);

// List user's media assets
router.get("/", requireAuth, mediaController.listAssets);

// Delete an asset
router.delete("/:id", requireAuth, mediaController.deleteAsset);

export default router;
