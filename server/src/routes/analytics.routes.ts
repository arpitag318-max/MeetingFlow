import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/', analyticsController.getSummary);

export default router;
