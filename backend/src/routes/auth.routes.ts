import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Start Flow: GET /api/v1/auth/linkedin/connect
router.get('/linkedin/connect', requireAuth, authController.getLinkedInAuthUrl);

// Callback: GET /api/v1/auth/linkedin/callback
router.get('/linkedin/callback', authController.handleLinkedInCallback);

// Disconnect: DELETE /api/v1/auth/linkedin
router.delete('/linkedin', requireAuth, authController.disconnectLinkedIn);

export default router;
