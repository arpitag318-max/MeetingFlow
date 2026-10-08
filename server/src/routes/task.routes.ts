import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';

const router = Router();

router.get('/', taskController.getAll);
router.patch('/:id', taskController.update);
router.post('/:id/complete', taskController.complete);
router.post('/:id/reminder', taskController.setReminder);

export default router;
