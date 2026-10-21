import mongoose, { Document, Schema, Types } from 'mongoose';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'user.created'
  | 'user.updated'
  | 'user.deactivated'
  | 'user.activated'
  | 'user.role_changed'
  | 'leave.submitted'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'leave.override_status'
  | 'balance.adjusted'
  | 'policy.created'
  | 'policy.updated'
  | 'department.created'
  | 'department.updated'
  | 'holiday.created'
  | 'holiday.updated'
  | 'holiday.deleted';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor?: Types.ObjectId;
  actorEmail?: string;
  action: AuditAction;
  entityType: string;
  entityId?: Types.ObjectId | string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, trim: true },
    action: {
      type: String,
      enum: [
        'auth.login', 'auth.logout', 'auth.login_failed',
        'user.created', 'user.updated', 'user.deactivated', 'user.activated', 'user.role_changed',
        'leave.submitted', 'leave.approved', 'leave.rejected', 'leave.cancelled', 'leave.override_status',
        'balance.adjusted',
        'policy.created', 'policy.updated',
        'department.created', 'department.updated',
        'holiday.created', 'holiday.updated', 'holiday.deleted',
      ] as AuditAction[],
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed },
    description: { type: String, required: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 300 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
