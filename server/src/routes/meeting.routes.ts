import { Router } from 'express';
import { meetingController } from '../controllers/meeting.controller.js';

const router = Router();

router.get('/upcoming', meetingController.getUpcoming);
router.get('/', meetingController.getAll);
router.post('/simulate', meetingController.simulateMeeting);
router.get('/:id', meetingController.getById);
router.get('/:id/transcript', meetingController.getTranscript);
router.get('/:id/processing-status', meetingController.getProcessingStatus);
router.post('/:id/process', meetingController.processMeeting);

export default router;
