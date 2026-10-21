import { Types } from 'mongoose';
import { AuditLog, AuditAction } from '../modules/audit/audit-log.model.js';
import { logger } from '../config/logger.js';

export interface AuditParams {
  actor?: Types.ObjectId;
  actorEmail?: string;
  action: AuditAction;
  entityType: string;
  entityId?: Types.ObjectId | string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await AuditLog.create({
      actor: params.actor,
      actorEmail: params.actorEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (err) {
    // Audit log failures should not break application flow
    logger.error({ err, params: { action: params.action, entityType: params.entityType } }, 'Failed to create audit log');
  }
}
