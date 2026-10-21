import mongoose, { Document, Schema, Types } from 'mongoose';

export type HolidayType =
  | 'FULL_DAY'
  | 'HALF_DAY_AFTERNOON'
  | 'HALF_DAY_MORNING'
  | 'OPTIONAL'
  | 'SPECIAL_WORKING_DAY';

export type HolidayScope = 'COMPANY_WIDE' | 'DEPARTMENT';

export interface ICompanyHoliday extends Document {
  _id: Types.ObjectId;
  name: string;
  date: Date;
  day?: string;
  holidayType: HolidayType;
  scope: HolidayScope;
  department?: Types.ObjectId | null;
  year: number;
  description?: string;
  isOptional: boolean;
  createdBy?: Types.ObjectId | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyHolidaySchema = new Schema<ICompanyHoliday>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    day: { type: String, trim: true },
    holidayType: {
      type: String,
      enum: ['FULL_DAY', 'HALF_DAY_AFTERNOON', 'HALF_DAY_MORNING', 'OPTIONAL', 'SPECIAL_WORKING_DAY'],
      default: 'FULL_DAY',
    },
    scope: {
      type: String,
      enum: ['COMPANY_WIDE', 'DEPARTMENT'],
      default: 'COMPANY_WIDE',
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    year: { type: Number, required: true },
    description: { type: String, trim: true, maxlength: 500 },
    isOptional: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompanyHolidaySchema.index({ date: 1 });
CompanyHolidaySchema.index({ year: 1 });
CompanyHolidaySchema.index({ date: 1, name: 1 }, { unique: true });
CompanyHolidaySchema.index({ scope: 1, department: 1 });

export const CompanyHoliday = mongoose.model<ICompanyHoliday>('CompanyHoliday', CompanyHolidaySchema);
