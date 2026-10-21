import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILeaveType extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    description: { type: String, trim: true, maxlength: 500 },
    isPaid: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: true },
    allowHalfDay: { type: Boolean, default: false },
    color: { type: String, default: '#0d6efd', match: /^#[0-9A-Fa-f]{6}$/ },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export interface ILeavePolicy extends Document {
  _id: Types.ObjectId;
  leaveType: Types.ObjectId;
  department?: Types.ObjectId;
  employmentStatus: string;
  annualEntitlement: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  minAdvanceNoticeDays: number;
  maxConsecutiveDays?: number;
  allowPastDating: boolean;
  policyYear: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeavePolicySchema = new Schema<ILeavePolicy>(
  {
    leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    employmentStatus: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'on-notice', 'all'],
      default: 'all',
    },
    annualEntitlement: { type: Number, required: true, min: 0 },
    carryForwardAllowed: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, default: 0, min: 0 },
    minAdvanceNoticeDays: { type: Number, default: 0, min: 0 },
    maxConsecutiveDays: { type: Number, min: 1 },
    allowPastDating: { type: Boolean, default: false },
    policyYear: { type: Number, required: true, default: new Date().getFullYear() },
  },
  { timestamps: true }
);

LeavePolicySchema.index({ leaveType: 1, department: 1, policyYear: 1 });

export const LeaveType = mongoose.model<ILeaveType>('LeaveType', LeaveTypeSchema);
export const LeavePolicy = mongoose.model<ILeavePolicy>('LeavePolicy', LeavePolicySchema);
