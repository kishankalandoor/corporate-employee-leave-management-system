import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { CompanyHoliday, HolidayType, HolidayScope } from './company-holiday.model.js';
import { User } from '../users/user.model.js';
import { Notification } from '../notifications/notification.model.js';
import { createAuditLog } from '../../utils/audit.service.js';
import { toDateOnly } from '../../utils/working-days.service.js';

const router = Router();

// Validation schema for creating/updating a holiday
const HolidaySchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().min(4), // YYYY-MM-DD or ISO
  day: z.string().optional(),
  holidayType: z.enum(['FULL_DAY', 'HALF_DAY_AFTERNOON', 'HALF_DAY_MORNING', 'OPTIONAL', 'SPECIAL_WORKING_DAY']),
  scope: z.enum(['COMPANY_WIDE', 'DEPARTMENT']).default('COMPANY_WIDE'),
  department: z.string().optional().nullable(),
  description: z.string().max(500).optional(),
  isOptional: z.boolean().default(false),
  published: z.boolean().default(true),
});

// Official 2026 holidays list requested by user
export const OFFICIAL_2026_HOLIDAYS = [
  {
    name: 'Makara Sankranti',
    date: '2026-01-15',
    day: 'Thursday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Traditional harvest festival celebration',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Republic Day',
    date: '2026-01-26',
    day: 'Monday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'National holiday honoring the Constitution of India',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Ugadi Festival',
    date: '2026-03-19',
    day: 'Thursday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'New Year celebration according to the Hindu calendar',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'May Day',
    date: '2026-05-01',
    day: 'Friday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'International Workers Day celebration',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Bakrid',
    date: '2026-05-28',
    day: 'Thursday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Feast of the Sacrifice (Eid al-Adha)',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Varasiddhi Vinayaka Vrata',
    date: '2026-09-14',
    day: 'Monday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Ganesh Chaturthi celebrations and worship',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Gandhi Jayanthi',
    date: '2026-10-02',
    day: 'Friday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'National holiday marking the birth anniversary of Mahatma Gandhi',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Vijayadashami',
    date: '2026-10-21',
    day: 'Wednesday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Dussehra victory celebration',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Balipadyami, Deepavali',
    date: '2026-11-10',
    day: 'Tuesday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Festival of Lights - Balipratipada / Diwali celebrations',
    year: 2026,
    isOptional: false,
    published: true,
  },
  {
    name: 'Christmas',
    date: '2026-12-25',
    day: 'Friday',
    holidayType: 'FULL_DAY' as HolidayType,
    scope: 'COMPANY_WIDE' as HolidayScope,
    description: 'Annual festival commemorating the birth of Jesus Christ',
    year: 2026,
    isOptional: false,
    published: true,
  },
];

// GET /api/holidays
// Accessible to any authenticated user (Employees see company + their department)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string, 10) || new Date().getUTCFullYear();
    const query: any = { year };

    // If regular employee, only show company-wide or their department
    if (req.user?.role === 'employee') {
      const userDept = req.user.department;
      if (userDept) {
        query.$or = [{ scope: 'COMPANY_WIDE' }, { department: userDept }];
      } else {
        query.scope = 'COMPANY_WIDE';
      }
    } else if (req.query.departmentId) {
      query.$or = [{ scope: 'COMPANY_WIDE' }, { department: req.query.departmentId }];
    }

    if (req.query.scope) {
      query.scope = req.query.scope;
    }

    const holidays = await CompanyHoliday.find(query)
      .populate('department', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .sort({ date: 1 })
      .lean();

    // Summary statistics
    const stats = {
      total: holidays.length,
      fullDay: holidays.filter((h) => h.holidayType === 'FULL_DAY').length,
      halfDay: holidays.filter(
        (h) => h.holidayType === 'HALF_DAY_AFTERNOON' || h.holidayType === 'HALF_DAY_MORNING'
      ).length,
      optional: holidays.filter((h) => h.holidayType === 'OPTIONAL' || h.isOptional).length,
      specialWorkingDay: holidays.filter((h) => h.holidayType === 'SPECIAL_WORKING_DAY').length,
    };

    res.json({ success: true, data: holidays, stats });
  } catch (err) {
    next(err);
  }
});

// POST /api/holidays
// Super Admin or Manager can declare a holiday
router.post(
  '/',
  requireAuth,
  requireRoles('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = HolidaySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'Invalid holiday data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
      }

      const { name, date, day, holidayType, scope, department, description, isOptional, published } = parsed.data;
      const holidayDate = toDateOnly(date);
      const year = holidayDate.getUTCFullYear();

      // Manager restriction: Managers can only declare holidays for their own assigned department
      if (req.user?.role === 'manager') {
        if (scope === 'COMPANY_WIDE') {
          throw new AppError(403, 'Managers can only declare department-level holidays. Company-wide holidays require Super Admin authorization.');
        }
        if (!department || department !== req.user.department?.toString()) {
          throw new AppError(403, 'Managers can only declare holidays for their assigned department');
        }
      }

      // Compute day name if not provided
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const calculatedDay = day || dayNames[holidayDate.getUTCDay()];

      // Prevent duplicate holiday on same date for same scope/dept
      const existing = await CompanyHoliday.findOne({
        date: holidayDate,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });
      if (existing) {
        throw new AppError(409, `A holiday named "${name}" is already defined on this date`);
      }

      const holiday = await CompanyHoliday.create({
        name,
        date: holidayDate,
        day: calculatedDay,
        holidayType,
        scope,
        department: department && scope === 'DEPARTMENT' ? new Types.ObjectId(department) : null,
        year,
        description,
        isOptional: isOptional || holidayType === 'OPTIONAL',
        createdBy: req.user!._id,
        published: published ?? true,
      });

      // Notify affected employees if published
      if (holiday.published) {
        const empQuery: any = { isActive: true };
        if (holiday.scope === 'DEPARTMENT' && holiday.department) {
          empQuery.department = holiday.department;
        }
        const affectedEmployees = await User.find(empQuery).select('_id');
        const notifDocs = affectedEmployees.map((emp) => ({
          recipient: emp._id,
          type: 'system',
          title: `Holiday Declared: ${holiday.name}`,
          message: `${holiday.name} has been declared as a ${holiday.holidayType.replace(/_/g, ' ').toLowerCase()} on ${calculatedDay}, ${holidayDate.toISOString().split('T')[0]}.`,
          relatedEntity: {
            entityType: 'CompanyHoliday',
            entityId: holiday._id,
          },
        }));
        if (notifDocs.length > 0) {
          await Notification.insertMany(notifDocs);
        }
      }

      // Audit log
      await createAuditLog({
        actor: req.user!._id,
        actorEmail: req.user?.email,
        action: 'holiday.created',
        entityType: 'CompanyHoliday',
        entityId: holiday._id,
        description: `Declared holiday "${holiday.name}" (${holiday.holidayType}) on ${calculatedDay}, ${holidayDate.toISOString().split('T')[0]}`,
      });

      res.status(201).json({
        success: true,
        message: 'Holiday successfully declared and published',
        data: holiday,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/holidays/:id
router.patch(
  '/:id',
  requireAuth,
  requireRoles('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid holiday ID');

      const holiday = await CompanyHoliday.findById(id);
      if (!holiday) throw new AppError(404, 'Holiday not found');

      if (req.user?.role === 'manager') {
        if (holiday.scope === 'COMPANY_WIDE' || holiday.department?.toString() !== req.user.department?.toString()) {
          throw new AppError(403, 'Managers can only edit holidays for their assigned department');
        }
      }

      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.date) {
        const d = toDateOnly(req.body.date);
        updates.date = d;
        updates.year = d.getUTCFullYear();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        updates.day = req.body.day || dayNames[d.getUTCDay()];
      }
      if (req.body.day) updates.day = req.body.day;
      if (req.body.holidayType) {
        updates.holidayType = req.body.holidayType;
        if (req.body.holidayType === 'OPTIONAL') updates.isOptional = true;
      }
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.published !== undefined) updates.published = req.body.published;
      if (req.body.isOptional !== undefined) updates.isOptional = req.body.isOptional;

      const updated = await CompanyHoliday.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .populate('department', 'name code')
        .populate('createdBy', 'firstName lastName email');

      await createAuditLog({
        actor: req.user!._id,
        actorEmail: req.user?.email,
        action: 'holiday.updated',
        entityType: 'CompanyHoliday',
        entityId: holiday._id,
        description: `Updated holiday "${holiday.name}"`,
      });

      res.json({ success: true, message: 'Holiday updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/holidays/:id
router.delete(
  '/:id',
  requireAuth,
  requireRoles('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid holiday ID');

      const holiday = await CompanyHoliday.findById(id);
      if (!holiday) throw new AppError(404, 'Holiday not found');

      if (req.user?.role === 'manager') {
        if (holiday.scope === 'COMPANY_WIDE' || holiday.department?.toString() !== req.user.department?.toString()) {
          throw new AppError(403, 'Managers can only delete holidays for their assigned department');
        }
      }

      await CompanyHoliday.findByIdAndDelete(id);

      await createAuditLog({
        actor: req.user!._id,
        actorEmail: req.user?.email,
        action: 'holiday.deleted',
        entityType: 'CompanyHoliday',
        entityId: holiday._id,
        description: `Deleted holiday "${holiday.name}" on ${holiday.date.toISOString().split('T')[0]}`,
      });

      res.json({ success: true, message: 'Holiday deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/holidays/seed-2026
// Admin utility to seed or reset the 10 official holidays
router.post(
  '/seed-2026',
  requireAuth,
  requireRoles('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      let createdCount = 0;
      for (const h of OFFICIAL_2026_HOLIDAYS) {
        const d = toDateOnly(h.date);
        const existing = await CompanyHoliday.findOne({
          year: 2026,
          name: h.name,
        });
        if (!existing) {
          await CompanyHoliday.create({
            ...h,
            date: d,
            createdBy: req.user?._id,
          });
          createdCount++;
        }
      }

      res.json({
        success: true,
        message: `Successfully seeded ${createdCount} official 2026 company holidays`,
        totalOfficial: OFFICIAL_2026_HOLIDAYS.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
