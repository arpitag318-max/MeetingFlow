import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();

router.post('/demo', authController.demoLogin);
router.get('/me', authController.getMe);
router.get('/google/url', authController.getGoogleAuthUrl);
router.get('/google/callback', authController.googleCallbackGet);
router.post('/google', authController.googleCallbackPost);
router.post('/google/callback', authController.googleCallbackPost);
router.post('/google/sync-token', authController.syncGoogleToken);
router.post('/google/config', authController.updateGoogleConfig);

export default router;
