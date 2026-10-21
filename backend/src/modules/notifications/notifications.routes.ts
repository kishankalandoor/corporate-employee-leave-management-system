import { Router, Response, NextFunction } from 'express';
import { Notification } from './notification.model.js';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { Types } from 'mongoose';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? 1), 10);
    const limit = parseInt(String(req.query.limit ?? 20), 10);
    const onlyUnread = req.query.unread === 'true';

    const filter: Record<string, unknown> = { recipient: req.user!._id };
    if (onlyUnread) filter.isRead = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user!._id, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid notification ID');

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user!._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) throw new AppError(404, 'Notification not found');
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ recipient: req.user!._id, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
