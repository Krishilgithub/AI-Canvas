"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const media_controller_1 = require("../controllers/media.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Upload a new asset (base64 body)
router.post("/upload", auth_middleware_1.requireAuth, media_controller_1.mediaController.uploadAsset);
// List user's media assets
router.get("/", auth_middleware_1.requireAuth, media_controller_1.mediaController.listAssets);
// Delete an asset
router.delete("/:id", auth_middleware_1.requireAuth, media_controller_1.mediaController.deleteAsset);
exports.default = router;
