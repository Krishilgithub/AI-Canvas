"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accounts_controller_1 = require("../controllers/accounts.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// List all connected accounts (optionally filter by ?platform=linkedin)
router.get("/", auth_middleware_1.requireAuth, accounts_controller_1.accountsController.listAccounts);
// Get primary account for a specific platform
router.get("/primary/:platform", auth_middleware_1.requireAuth, accounts_controller_1.accountsController.getPrimaryAccount);
// Rename an account label
router.patch("/:id/label", auth_middleware_1.requireAuth, accounts_controller_1.accountsController.updateLabel);
// Disconnect a specific account by row ID
router.delete("/:id", auth_middleware_1.requireAuth, accounts_controller_1.accountsController.disconnectAccount);
exports.default = router;
