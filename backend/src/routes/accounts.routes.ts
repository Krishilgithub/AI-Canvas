import { Router } from "express";
import { accountsController } from "../controllers/accounts.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// List all connected accounts (optionally filter by ?platform=linkedin)
router.get("/", requireAuth, accountsController.listAccounts);

// Get primary account for a specific platform
router.get("/primary/:platform", requireAuth, accountsController.getPrimaryAccount);

// Rename an account label
router.patch("/:id/label", requireAuth, accountsController.updateLabel);

// Disconnect a specific account by row ID
router.delete("/:id", requireAuth, accountsController.disconnectAccount);

export default router;
