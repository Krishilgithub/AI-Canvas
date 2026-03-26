"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const keys_controller_1 = require("../controllers/keys.controller");
const router = (0, express_1.Router)();
router.post("/save", keys_controller_1.keysController.saveKey);
router.get("/status", keys_controller_1.keysController.getStatus);
router.delete("/remove", keys_controller_1.keysController.removeKey);
exports.default = router;
