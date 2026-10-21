import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import argon2 from 'argon2';
import { logger } from '../config/logger.js';

// Models
import { Department } from '../modules/departments/department.model.js';
import { User, UserRole } from '../modules/users/user.model.js';
import { LeaveType } from '../modules/leave-types/leave-type.model.js';
import { LeavePolicy } from '../modules/leave-types/leave-type.model.js';
import { LeaveBalance } from '../modules/leave-balances/leave-balance.model.js';
import { LeaveRequest } from '../modules/leave-requests/leave-request.model.js';
import { CompanyHoliday } from '../modules/holidays/company-holiday.model.js';
import { OFFICIAL_2026_HOLIDAYS } from '../modules/holidays/holidays.routes.js';
import { toDateOnly } from '../utils/working-days.service.js';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://mongodb:27017/leave_management';
const CURRENT_YEAR = 2026;

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function seedRealTeam() {
  logger.info('Connecting to MongoDB for Real Team Seeding...');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  }

  logger.info('Connected. Cleaning up old dummy users and initializing real Exelon team...');

  // 1. Remove old dummy users
  const dummyEmails = [
    'admin@exeloncircuits.com',
    'manager.eng@exeloncircuits.com',
    'manager.hr@exeloncircuits.com',
    'employee1@exeloncircuits.com',
    'employee2@exeloncircuits.com',
    'employee3@exeloncircuits.com',
    'employee4@exeloncircuits.com',
  ];

  const dummyUsers = await User.find({ email: { $in: dummyEmails } });
  const dummyIds = dummyUsers.map((u) => u._id);

  if (dummyIds.length > 0) {
    await LeaveBalance.deleteMany({ employee: { $in: dummyIds } });
    await LeaveRequest.deleteMany({ employee: { $in: dummyIds } });
    await User.deleteMany({ _id: { $in: dummyIds } });
    logger.info(`Removed ${dummyIds.length} dummy users and their records.`);
  }

  // 2. Ensure Departments exist
  const deptData = [
    { name: 'Engineering', code: 'ENG', description: 'Software engineering, frontend, backend, full stack' },
    { name: 'Executive Leadership', code: 'EXEC', description: 'Executive management and directorship' },
    { name: 'Human Resources', code: 'HR', description: 'People operations and talent management' },
    { name: 'Project & QA', code: 'PM', description: 'Project management, business and quality analysis' },
    { name: 'Finance & Accounts', code: 'FIN', description: 'Financial accounting and compliance' },
    { name: 'Design & Media', code: 'DESIGN', description: 'Graphic design, UI/UX and media editing' },
  ];

  const departments: Record<string, mongoose.Types.ObjectId> = {};
  for (const d of deptData) {
    const dept = await Department.findOneAndUpdate(
      { code: d.code },
      { $set: d },
      { upsert: true, new: true }
    );
    departments[d.code] = dept._id;
  }
  logger.info('Departments verified and updated');

  // 3. Ensure Leave Types and Policies exist
  const leaveTypeData = [
    { name: 'Casual Leave', code: 'CL', isPaid: true, requiresApproval: true, allowHalfDay: true, color: '#0d6efd' },
    { name: 'Sick Leave', code: 'SL', isPaid: true, requiresApproval: false, allowHalfDay: true, color: '#dc3545' },
    { name: 'Annual Leave', code: 'AL', isPaid: true, requiresApproval: true, allowHalfDay: false, color: '#198754' },
    { name: 'Unpaid Leave', code: 'UL', isPaid: false, requiresApproval: true, allowHalfDay: false, color: '#6c757d' },
    { name: 'Maternity Leave', code: 'ML', isPaid: true, requiresApproval: true, allowHalfDay: false, color: '#e83e8c' },
    { name: 'Paternity Leave', code: 'PL', isPaid: true, requiresApproval: true, allowHalfDay: false, color: '#20c997' },
  ];

  const leaveTypes: Record<string, mongoose.Types.ObjectId> = {};
  for (const lt of leaveTypeData) {
    const leaveType = await LeaveType.findOneAndUpdate(
      { code: lt.code },
      { $set: lt },
      { upsert: true, new: true }
    );
    leaveTypes[lt.code] = leaveType._id;
  }

  // 4. Ensure 2026 Company Holidays are present
  for (const h of OFFICIAL_2026_HOLIDAYS) {
    await CompanyHoliday.findOneAndUpdate(
      { name: h.name, year: 2026 },
      { $set: { ...h, date: toDateOnly(h.date) } },
      { upsert: true }
    );
  }

  // 5. Seed the Real 21 Employees
  const realEmployees = [
    {
      slNo: 1,
      firstName: 'Pratheeksha',
      lastName: 'Karkera',
      jobTitle: 'Full Stack Developer',
      email: 'pratheeksha.karkera@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 2,
      firstName: 'Melroy',
      lastName: 'Pinto',
      jobTitle: 'Co-Founder & Director',
      email: 'melroy.pinto@exeloncircuits.com',
      role: 'admin' as UserRole,
      deptCode: 'EXEC',
    },
    {
      slNo: 3,
      firstName: 'Madhavi',
      lastName: 'Shenoy',
      jobTitle: 'Entrepreneur',
      email: 'madhavi.shenoy@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'EXEC',
    },
    {
      slNo: 4,
      firstName: 'Ranjini',
      lastName: 'Aithal',
      jobTitle: 'Entrepreneur',
      email: 'ranjini.aithal@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'EXEC',
    },
    {
      slNo: 5,
      firstName: 'Sudarshan',
      lastName: 'P K',
      jobTitle: 'Co-Founder & Director',
      email: 'sudarshan.pk@exeloncircuits.com',
      role: 'admin' as UserRole,
      deptCode: 'EXEC',
    },
    {
      slNo: 6,
      firstName: 'Aravinda Acharya',
      lastName: 'J P',
      jobTitle: 'Frontend Developer',
      email: 'aravinda.acharya@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 7,
      firstName: 'Aakanksha',
      lastName: 'Hanchinamath',
      jobTitle: 'Lead Project Manager',
      email: 'aakanksha.hanchinamath@exeloncircuits.com',
      role: 'manager' as UserRole,
      deptCode: 'PM',
    },
    {
      slNo: 8,
      firstName: 'Sinchana',
      lastName: 'K',
      jobTitle: 'Accounts',
      email: 'sinchana.k@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'FIN',
    },
    {
      slNo: 9,
      firstName: 'Jyothi Y',
      lastName: 'Suvarna',
      jobTitle: 'Frontend Developer',
      email: 'jyothi.suvarna@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 10,
      firstName: 'Goutham',
      lastName: 'Kumar',
      jobTitle: 'Lead Frontend Engineer',
      email: 'goutham.kumar@exeloncircuits.com',
      role: 'manager' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 11,
      firstName: 'Ankit',
      lastName: 'Shetty',
      jobTitle: 'Full Stack Developer',
      email: 'ankit.shetty@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 12,
      firstName: 'Anish',
      lastName: 'D Souza',
      jobTitle: 'Business & Quality Analyst',
      email: 'anish.dsouza@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'PM',
    },
    {
      slNo: 13,
      firstName: 'Rowin Machangee',
      lastName: 'Mathias',
      jobTitle: 'Aspiring Software Developer',
      email: 'rowin.mathias@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 14,
      firstName: 'Rachana',
      lastName: 'S',
      jobTitle: 'Backend Developer',
      email: 'rachana.s@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 15,
      firstName: 'Sahana',
      lastName: 'Naik',
      jobTitle: 'Frontend Developer',
      email: 'sahana.naik@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 16,
      firstName: 'Bhavish',
      lastName: 'Shetty',
      jobTitle: 'Graphic Designer & Video Editor',
      email: 'bhavish.shetty@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'DESIGN',
    },
    {
      slNo: 18,
      firstName: 'Jayaprakash',
      lastName: 'Shettigar',
      jobTitle: 'Trainee – Associate Team Lead',
      email: 'jayaprakash.shettigar@exeloncircuits.com',
      role: 'manager' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 19,
      firstName: 'Rahul Pritham',
      lastName: 'D Souza',
      jobTitle: 'HR',
      email: 'rahul.dsouza@exeloncircuits.com',
      role: 'admin' as UserRole,
      deptCode: 'HR',
    },
    {
      slNo: 20,
      firstName: 'Vishwas',
      lastName: 'Poojary',
      jobTitle: 'Full Stack Developer Trainee',
      email: 'vishwas.poojary@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
    {
      slNo: 21,
      firstName: 'Fencita',
      lastName: 'Rodrigues',
      jobTitle: 'HR & Operations Trainee',
      email: 'fencita.rodrigues@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'HR',
    },
    {
      slNo: 22,
      firstName: 'Kishan',
      lastName: 'Kalandoor',
      jobTitle: 'Forward Deployed Engineer',
      email: 'kishankalandoor@exeloncircuits.com',
      role: 'employee' as UserRole,
      deptCode: 'ENG',
    },
  ];

  const defaultPasswordHash = await hashPassword('Exelon@12345');
  const userMap: Record<string, any> = {};

  for (const emp of realEmployees) {
    const employeeId = `EXL-${String(emp.slNo).padStart(4, '0')}`;
    const userDoc = await User.findOneAndUpdate(
      { email: emp.email },
      {
        $set: {
          employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          jobTitle: emp.jobTitle,
          role: emp.role,
          department: departments[emp.deptCode] || departments['ENG'],
          joiningDate: new Date('2023-01-01'),
          status: 'active',
          employmentStatus: 'full-time',
          passwordHash: defaultPasswordHash,
        },
      },
      { upsert: true, new: true }
    );
    userMap[emp.email] = userDoc;
  }
  logger.info(`Seeded ${realEmployees.length} real company employees.`);

  // 6. Setup Manager Relationships
  const melroy = userMap['melroy.pinto@exeloncircuits.com'];
  const goutham = userMap['goutham.kumar@exeloncircuits.com'];
  const aakanksha = userMap['aakanksha.hanchinamath@exeloncircuits.com'];
  const jayaprakash = userMap['jayaprakash.shettigar@exeloncircuits.com'];

  // Engineering developers report to Goutham Kumar or Jayaprakash Shettigar
  const engTeam = [
    'pratheeksha.karkera@exeloncircuits.com',
    'aravinda.acharya@exeloncircuits.com',
    'jyothi.suvarna@exeloncircuits.com',
    'ankit.shetty@exeloncircuits.com',
    'rowin.mathias@exeloncircuits.com',
    'rachana.s@exeloncircuits.com',
    'sahana.naik@exeloncircuits.com',
    'kishankalandoor@exeloncircuits.com',
  ];
  for (const email of engTeam) {
    if (userMap[email] && goutham) {
      await User.updateOne({ email }, { $set: { manager: goutham._id } });
    }
  }

  // Trainees report to Jayaprakash
  if (userMap['vishwas.poojary@exeloncircuits.com'] && jayaprakash) {
    await User.updateOne({ email: 'vishwas.poojary@exeloncircuits.com' }, { $set: { manager: jayaprakash._id } });
  }

  // PM & Business Analyst report to Aakanksha
  if (userMap['anish.dsouza@exeloncircuits.com'] && aakanksha) {
    await User.updateOne({ email: 'anish.dsouza@exeloncircuits.com' }, { $set: { manager: aakanksha._id } });
  }

  // Managers report to Melroy Pinto (Co-Founder & Director)
  const managerEmails = [
    'goutham.kumar@exeloncircuits.com',
    'aakanksha.hanchinamath@exeloncircuits.com',
    'jayaprakash.shettigar@exeloncircuits.com',
    'rahul.dsouza@exeloncircuits.com',
    'sinchana.k@exeloncircuits.com',
    'bhavish.shetty@exeloncircuits.com',
  ];
  for (const email of managerEmails) {
    if (userMap[email] && melroy) {
      await User.updateOne({ email }, { $set: { manager: melroy._id } });
    }
  }

  // 7. Initialize Leave Balances for 2026 for all real employees
  const balancesToSeed = [
    { code: 'CL', entitlement: 12 },
    { code: 'SL', entitlement: 10 },
    { code: 'AL', entitlement: 15 },
    { code: 'UL', entitlement: 30 },
  ];

  for (const email of Object.keys(userMap)) {
    const user = userMap[email];
    for (const b of balancesToSeed) {
      const leaveTypeId = leaveTypes[b.code];
      if (!leaveTypeId) continue;
      await LeaveBalance.findOneAndUpdate(
        { employee: user._id, leaveType: leaveTypeId, policyYear: CURRENT_YEAR },
        {
          $setOnInsert: {
            employee: user._id,
            leaveType: leaveTypeId,
            policyYear: CURRENT_YEAR,
            entitlement: b.entitlement,
            carryForward: 0,
            usedDays: 0,
            pendingDays: 0,
            adjustments: 0,
          },
        },
        { upsert: true }
      );
    }
  }
  logger.info('Initialized 2026 leave balances for all employees');

  // 8. Create Live Attendance Data for Today
  // Ankit Shetty on leave today for conference
  const ankit = userMap['ankit.shetty@exeloncircuits.com'];
  if (ankit && goutham) {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

    await LeaveRequest.findOneAndUpdate(
      { requestNumber: 'LR-2026-EXL-001' },
      {
        $set: {
          requestNumber: 'LR-2026-EXL-001',
          employee: ankit._id,
          leaveType: leaveTypes['CL'],
          startDate: todayStart,
          endDate: todayEnd,
          workingDays: 1,
          isHalfDay: false,
          reason: 'Attending Developer Tech Summit & Regional Tech Expo',
          status: 'approved',
          approver: goutham._id,
          decidedBy: goutham._id,
          decidedAt: new Date(Date.now() - 86400000),
          submittedAt: new Date(Date.now() - 86400000),
        },
      },
      { upsert: true }
    );

    // Consume 1 day from Ankit's CL balance
    await LeaveBalance.updateOne(
      { employee: ankit._id, leaveType: leaveTypes['CL'], policyYear: CURRENT_YEAR },
      { $set: { usedDays: 1 } }
    );
  }

  // Pratheeksha Karkera has a pending leave request
  const pratheeksha = userMap['pratheeksha.karkera@exeloncircuits.com'];
  if (pratheeksha) {
    const futureDate = new Date(Date.now() + 86400000 * 5);
    await LeaveRequest.findOneAndUpdate(
      { requestNumber: 'LR-2026-EXL-002' },
      {
        $set: {
          requestNumber: 'LR-2026-EXL-002',
          employee: pratheeksha._id,
          leaveType: leaveTypes['CL'],
          startDate: futureDate,
          endDate: futureDate,
          workingDays: 1,
          isHalfDay: false,
          reason: 'Family function in Udupi',
          status: 'pending',
          submittedAt: new Date(),
        },
      },
      { upsert: true }
    );

    await LeaveBalance.updateOne(
      { employee: pratheeksha._id, leaveType: leaveTypes['CL'], policyYear: CURRENT_YEAR },
      { $set: { pendingDays: 1 } }
    );
  }

  logger.info('Real Exelon team seeding successfully finished!');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].includes('seed-real-team')) {
  seedRealTeam()
    .then(() => {
      logger.info('Done');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to seed real team');
      process.exit(1);
    });
}
