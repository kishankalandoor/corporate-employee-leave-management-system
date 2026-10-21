import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'leave_pending_approval'
  | 'system';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    entityType: string;
    entityId: Types.ObjectId;
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'leave_submitted',
        'leave_approved',
        'leave_rejected',
        'leave_cancelled',
        'leave_pending_approval',
        'system',
      ] as NotificationType[],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    relatedEntity: {
      entityType: { type: String },
      entityId: { type: Schema.Types.ObjectId },
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
