import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  head?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
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
    head: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ code: 1 });
DepartmentSchema.index({ isActive: 1 });

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
