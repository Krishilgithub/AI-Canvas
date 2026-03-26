import { Router } from "express";
import { keysController } from "../controllers/keys.controller";

const router = Router();

router.post("/save", keysController.saveKey);
router.get("/status", keysController.getStatus);
router.delete("/remove", keysController.removeKey);

export default router;
