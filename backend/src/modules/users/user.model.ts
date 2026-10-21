import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = 'employee' | 'manager' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type EmploymentStatus = 'full-time' | 'part-time' | 'contract' | 'on-notice';

export interface IUser extends Document {
  _id: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: Types.ObjectId;
  manager?: Types.ObjectId;
  jobTitle: string;
  joiningDate: Date;
  status: UserStatus;
  employmentStatus: EmploymentStatus;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  get fullName(): string;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^EXL-\d{4,6}$/,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin'] as UserRole[],
      required: true,
      default: 'employee',
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    jobTitle: { type: String, required: true, trim: true, maxlength: 150 },
    joiningDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive'] as UserStatus[],
      required: true,
      default: 'active',
    },
    employmentStatus: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'on-notice'] as EmploymentStatus[],
      default: 'full-time',
    },
    phone: { type: String, trim: true, maxlength: 20 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ department: 1, status: 1 });
UserSchema.index({ manager: 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
