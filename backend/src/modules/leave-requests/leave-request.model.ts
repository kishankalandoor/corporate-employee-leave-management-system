import mongoose, { Document, Schema, Types } from 'mongoose';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'first-half' | 'second-half';

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  requestNumber: string;
  employee: Types.ObjectId;
  leaveType: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDayType?: HalfDayType;
  workingDays: number;
  reason: string;
  status: LeaveRequestStatus;
  approver?: Types.ObjectId;
  approvedAt?: Date;
  approverComments?: string;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    requestNumber: { type: String, required: true, unique: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isHalfDay: { type: Boolean, default: false },
    halfDayType: {
      type: String,
      enum: ['first-half', 'second-half'] as HalfDayType[],
    },
    workingDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'] as LeaveRequestStatus[],
      default: 'pending',
    },
    approver: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date },
    approverComments: { type: String, trim: true, maxlength: 1000 },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employee: 1, status: 1 });
LeaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });
LeaveRequestSchema.index({ status: 1, submittedAt: -1 });
LeaveRequestSchema.index({ approver: 1, status: 1 });

// Validate: endDate >= startDate
LeaveRequestSchema.pre('validate', function (this: ILeaveRequest) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after start date');
  }
});

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
