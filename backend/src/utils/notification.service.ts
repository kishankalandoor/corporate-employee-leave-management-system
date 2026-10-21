import { Types } from 'mongoose';
import { Notification, NotificationType } from '../modules/notifications/notification.model.js';
import { logger } from '../config/logger.js';

export interface NotificationParams {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId;
}

export async function createNotification(params: NotificationParams): Promise<void> {
  try {
    await Notification.create({
      recipient: params.recipient,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedEntity: params.relatedEntityType
        ? { entityType: params.relatedEntityType, entityId: params.relatedEntityId }
        : undefined,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create notification');
  }
}

export async function notifyLeaveSubmitted(
  employeeId: Types.ObjectId,
  managerId: Types.ObjectId,
  requestNumber: string,
  employeeName: string
): Promise<void> {
  await Promise.all([
    createNotification({
      recipient: employeeId,
      type: 'leave_submitted',
      title: 'Leave Request Submitted',
      message: `Your leave request ${requestNumber} has been submitted and is pending approval.`,
    }),
    createNotification({
      recipient: managerId,
      type: 'leave_pending_approval',
      title: 'New Leave Request Pending Approval',
      message: `${employeeName} has submitted a new leave request (${requestNumber}) awaiting your approval.`,
    }),
  ]);
}

export async function notifyLeaveApproved(
  employeeId: Types.ObjectId,
  requestNumber: string
): Promise<void> {
  await createNotification({
    recipient: employeeId,
    type: 'leave_approved',
    title: 'Leave Request Approved',
    message: `Your leave request ${requestNumber} has been approved.`,
  });
}

export async function notifyLeaveRejected(
  employeeId: Types.ObjectId,
  requestNumber: string,
  reason?: string
): Promise<void> {
  await createNotification({
    recipient: employeeId,
    type: 'leave_rejected',
    title: 'Leave Request Rejected',
    message: `Your leave request ${requestNumber} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
  });
}

export async function notifyLeaveCancelled(
  employeeId: Types.ObjectId,
  requestNumber: string
): Promise<void> {
  await createNotification({
    recipient: employeeId,
    type: 'leave_cancelled',
    title: 'Leave Request Cancelled',
    message: `Your leave request ${requestNumber} has been cancelled.`,
  });
}
