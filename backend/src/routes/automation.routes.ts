import express from 'express';
import { AutomationController } from '../controllers/automation.controller';

const router = express.Router();
const controller = new AutomationController();

// Config
router.post('/config', controller.saveConfig);
router.get('/config', controller.getConfig);

// n8n Webhooks / Triggers
router.post('/ingest-trend', controller.ingestTrend);
router.post('/create-draft', controller.createDraft);

// App Data
router.get('/trends', controller.getTrends);
router.get('/posts', controller.getPosts);

// Actions
router.post('/trigger-post', controller.triggerPost);
router.post('/seed', controller.seedData);

export default router;
