import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILeaveBalance extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  leaveType: Types.ObjectId;
  policyYear: number;
  entitlement: number;
  carryForward: number;
  adjustments: number;
  usedDays: number;
  pendingDays: number;
  createdAt: Date;
  updatedAt: Date;
  get available(): number;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    policyYear: { type: Number, required: true, default: new Date().getFullYear() },
    entitlement: { type: Number, required: true, default: 0, min: 0 },
    carryForward: { type: Number, default: 0, min: 0 },
    adjustments: { type: Number, default: 0 },
    usedDays: { type: Number, default: 0, min: 0 },
    pendingDays: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

LeaveBalanceSchema.virtual('available').get(function (this: ILeaveBalance) {
  return Math.max(0, this.entitlement + this.carryForward + this.adjustments - this.usedDays);
});

LeaveBalanceSchema.index({ employee: 1, leaveType: 1, policyYear: 1 }, { unique: true });
LeaveBalanceSchema.index({ employee: 1, policyYear: 1 });

export const LeaveBalance = mongoose.model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);
