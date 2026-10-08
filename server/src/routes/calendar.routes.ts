import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';

const router = Router();

router.get('/events', calendarController.getEvents);
router.get('/diagnostics', calendarController.getDiagnostics);
router.post('/reminders', calendarController.createReminder);

export default router;

