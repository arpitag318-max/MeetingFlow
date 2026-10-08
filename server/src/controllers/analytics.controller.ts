import { Request, Response } from 'express';
import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';

export const analyticsController = {
  getSummary: (req: Request, res: Response) => {
    if (req.isDemoUser) {
      return res.json({
        success: true,
        analytics: demoStore.getAnalytics(),
        isRealMode: false
      });
    }

    // REAL MODE: Calculate strictly from user's authentic database records
    const userId = req.user?.id || 'anonymous';
    const analytics = persistentDb.getAnalyticsForUser(userId);

    return res.json({
      success: true,
      analytics,
      isRealMode: true
    });
  }
};
