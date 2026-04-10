"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comments_controller_1 = require("../controllers/comments.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// List comments for a post
router.get("/:post_id", auth_middleware_1.requireAuth, comments_controller_1.commentsController.listComments);
// Add a comment to a post
router.post("/:post_id", auth_middleware_1.requireAuth, comments_controller_1.commentsController.addComment);
// Delete a specific comment
router.delete("/:post_id/:comment_id", auth_middleware_1.requireAuth, comments_controller_1.commentsController.deleteComment);
exports.default = router;
