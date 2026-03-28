import { Router } from "express";
import { commentsController } from "../controllers/comments.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// List comments for a post
router.get("/:post_id", requireAuth, commentsController.listComments);

// Add a comment to a post
router.post("/:post_id", requireAuth, commentsController.addComment);

// Delete a specific comment
router.delete("/:post_id/:comment_id", requireAuth, commentsController.deleteComment);

export default router;
