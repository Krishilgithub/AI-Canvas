import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Profile Routes
router.get("/profile", requireAuth, userController.getProfile);
router.post("/profile", requireAuth, userController.updateProfile);

// API Key Routes
router.post("/profile/api-key", requireAuth, userController.generateApiKey);

// Subscription Routes
router.get(
  "/profile/subscription",
  requireAuth,
  userController.getSubscription,
);

// Account Deletion
router.delete("/profile", requireAuth, userController.deleteAccount);

export default router;
