import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", postController.listPosts);
router.get("/:id", postController.getPost);
router.delete("/:id", postController.deletePost);
router.put("/:id", postController.updatePost);

export default router;
