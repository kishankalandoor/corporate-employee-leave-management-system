import { Types } from 'mongoose';
import { LeaveBalance } from '../modules/leave-balances/leave-balance.model.js';
import { logger } from '../config/logger.js';

export interface BalanceUpdateResult {
  success: boolean;
  message?: string;
}

/**
 * Reserves pending days when a leave request is submitted.
 * Does NOT consume approved days at this point.
 */
export async function reservePendingDays(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  days: number,
  policyYear: number
): Promise<BalanceUpdateResult> {
  const balance = await LeaveBalance.findOne({
    employee: employeeId,
    leaveType: leaveTypeId,
    policyYear,
  });

  if (!balance) {
    return { success: false, message: 'Leave balance record not found for this leave type' };
  }

  const available = balance.entitlement + balance.carryForward + balance.adjustments - balance.usedDays;
  if (available < days) {
    return {
      success: false,
      message: `Insufficient leave balance. Available: ${available} days, Requested: ${days} days`,
    };
  }

  await LeaveBalance.updateOne(
    { _id: balance._id },
    { $inc: { pendingDays: days } }
  );

  return { success: true };
}

/**
 * Consumes approved days and releases the pending reservation.
 * Called atomically when a leave request is approved.
 */
export async function consumeApprovedDays(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  days: number,
  policyYear: number
): Promise<BalanceUpdateResult> {
  const result = await LeaveBalance.updateOne(
    {
      employee: employeeId,
      leaveType: leaveTypeId,
      policyYear,
      pendingDays: { $gte: days },
    },
    {
      $inc: { usedDays: days, pendingDays: -days },
    }
  );

  if (result.modifiedCount === 0) {
    logger.warn({ employeeId, leaveTypeId, days }, 'consumeApprovedDays: no balance updated');
    // Fallback: just add to used days even if pending tracking is off
    await LeaveBalance.updateOne(
      { employee: employeeId, leaveType: leaveTypeId, policyYear },
      { $inc: { usedDays: days } }
    );
  }

  return { success: true };
}

/**
 * Restores pending days when a leave request is rejected.
 */
export async function releasePendingDays(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  days: number,
  policyYear: number
): Promise<void> {
  await LeaveBalance.updateOne(
    { employee: employeeId, leaveType: leaveTypeId, policyYear },
    { $inc: { pendingDays: -Math.abs(days) } }
  );
}

/**
 * Restores consumed days when an approved leave request is cancelled.
 */
export async function restoreApprovedDays(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  days: number,
  policyYear: number
): Promise<void> {
  await LeaveBalance.updateOne(
    { employee: employeeId, leaveType: leaveTypeId, policyYear },
    { $inc: { usedDays: -Math.abs(days) } }
  );
}

/**
 * Applies a manual admin adjustment to the balance.
 */
export async function applyManualAdjustment(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  adjustmentDays: number,
  policyYear: number
): Promise<BalanceUpdateResult> {
  const result = await LeaveBalance.updateOne(
    { employee: employeeId, leaveType: leaveTypeId, policyYear },
    { $inc: { adjustments: adjustmentDays } }
  );

  if (result.matchedCount === 0) {
    return { success: false, message: 'Balance record not found' };
  }

  return { success: true };
}

/**
 * Handles balance adjustments when an admin overrides or changes the status of a leave request
 * (e.g. from cancelled to approved, approved to cancelled, rejected to approved, etc.)
 */
export async function transitionBalanceForStatusChange(
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  oldStatus: string,
  newStatus: string,
  days: number,
  policyYear: number
): Promise<BalanceUpdateResult> {
  if (oldStatus === newStatus) return { success: true };

  const absDays = Math.abs(days);

  // If changing TO approved:
  if (newStatus === 'approved') {
    if (oldStatus === 'pending') {
      return consumeApprovedDays(employeeId, leaveTypeId, absDays, policyYear);
    } else {
      // Was cancelled or rejected (not currently in pendingDays)
      // Check if user has enough balance
      const balance = await LeaveBalance.findOne({
        employee: employeeId,
        leaveType: leaveTypeId,
        policyYear,
      });
      if (balance) {
        const available = balance.entitlement + balance.carryForward + balance.adjustments - balance.usedDays;
        if (available < absDays) {
          logger.warn({ employeeId, available, absDays }, 'Admin approving with tight balance');
        }
      }
      await LeaveBalance.updateOne(
        { employee: employeeId, leaveType: leaveTypeId, policyYear },
        { $inc: { usedDays: absDays } }
      );
      return { success: true };
    }
  }

  // If changing FROM approved:
  if (oldStatus === 'approved') {
    // Was counted in usedDays, so deduct from usedDays
    await restoreApprovedDays(employeeId, leaveTypeId, absDays, policyYear);
    if (newStatus === 'pending') {
      await LeaveBalance.updateOne(
        { employee: employeeId, leaveType: leaveTypeId, policyYear },
        { $inc: { pendingDays: absDays } }
      );
    }
    return { success: true };
  }

  // If changing FROM pending:
  if (oldStatus === 'pending') {
    // Release pending reservation
    await releasePendingDays(employeeId, leaveTypeId, absDays, policyYear);
    return { success: true };
  }

  // If changing TO pending from cancelled or rejected:
  if (newStatus === 'pending' && (oldStatus === 'cancelled' || oldStatus === 'rejected')) {
    await LeaveBalance.updateOne(
      { employee: employeeId, leaveType: leaveTypeId, policyYear },
      { $inc: { pendingDays: absDays } }
    );
    return { success: true };
  }

  return { success: true };
}
