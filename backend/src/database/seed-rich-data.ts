import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import { User } from '../modules/users/user.model.js';
import { LeaveType } from '../modules/leave-types/leave-type.model.js';
import { LeaveBalance } from '../modules/leave-balances/leave-balance.model.js';
import { LeaveRequest } from '../modules/leave-requests/leave-request.model.js';
import { AuditLog } from '../modules/audit/audit-log.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import {
  leaveRequestsTotal,
  leaveApprovalsTotal,
  authAttemptsTotal,
  activeUsersGauge,
  pendingApprovalsGauge,
} from '../observability/metrics.js';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://mongodb:27017/leave_management';
const CURRENT_YEAR = 2026;

export async function seedRichData() {
  logger.info('Connecting to MongoDB for rich enterprise data seeding...');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  }

  // Load all users
  const users = await User.find({ status: 'active' });
  if (users.length === 0) {
    logger.warn('No active users found. Run seedRealTeam first.');
    return;
  }
  const userMap = new Map<string, any>();
  users.forEach((u) => userMap.set(u.email, u));

  // Load leave types
  const leaveTypes = await LeaveType.find({});
  const ltMap = new Map<string, any>();
  leaveTypes.forEach((lt) => ltMap.set(lt.code, lt));

  const cl = ltMap.get('CL');
  const sl = ltMap.get('SL');
  const al = ltMap.get('AL');
  const ul = ltMap.get('UL');

  if (!cl || !sl || !al) {
    logger.error('Leave types missing in DB');
    return;
  }

  // Clear existing leave requests, audit logs, notifications
  await LeaveRequest.deleteMany({});
  await AuditLog.deleteMany({});
  await Notification.deleteMany({});
  logger.info('Cleared old leave requests, audit logs, and notifications.');

  const melroy = userMap.get('melroy.pinto@exeloncircuits.com');
  const goutham = userMap.get('goutham.kumar@exeloncircuits.com');
  const aakanksha = userMap.get('aakanksha.hanchinamath@exeloncircuits.com');
  const jayaprakash = userMap.get('jayaprakash.shettigar@exeloncircuits.com');

  // Key real employee objects
  const ankit = userMap.get('ankit.shetty@exeloncircuits.com');
  const jyothi = userMap.get('jyothi.suvarna@exeloncircuits.com');
  const pratheeksha = userMap.get('pratheeksha.karkera@exeloncircuits.com');
  const aravinda = userMap.get('aravinda.acharya@exeloncircuits.com');
  const rowin = userMap.get('rowin.mathias@exeloncircuits.com');
  const rachana = userMap.get('rachana.s@exeloncircuits.com');
  const sahana = userMap.get('sahana.naik@exeloncircuits.com');
  const anish = userMap.get('anish.dsouza@exeloncircuits.com');
  const sinchana = userMap.get('sinchana.k@exeloncircuits.com');
  const bhavish = userMap.get('bhavish.shetty@exeloncircuits.com');
  const vishwas = userMap.get('vishwas.poojary@exeloncircuits.com');
  const rahul = userMap.get('rahul.dsouza@exeloncircuits.com');
  const fencita = userMap.get('fencita.rodrigues@exeloncircuits.com');
  const madhavi = userMap.get('madhavi.shenoy@exeloncircuits.com');
  const ranjini = userMap.get('ranjini.aithal@exeloncircuits.com');
  const sudarshan = userMap.get('sudarshan.pk@exeloncircuits.com');
  const kishan = userMap.get('kishankalandoor@exeloncircuits.com');

  let reqIndex = 1;
  const genReqNum = () => `LR-2026-EXL-${String(reqIndex++).padStart(4, '0')}`;

  const leaveDefinitions: any[] = [];

  // =========================================================================
  // 1. ACTIVE ON LEAVE TODAY (OCTOBER 21, 2026) -> 3 Employees absent today
  // =========================================================================
  const todayStart = new Date(Date.UTC(2026, 9, 21, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(2026, 9, 21, 23, 59, 59));

  if (ankit && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: ankit,
      leaveType: cl,
      startDate: todayStart,
      endDate: todayEnd,
      workingDays: 1,
      isHalfDay: false,
      reason: 'Attending Developer Tech Summit & Regional Tech Expo',
      status: 'approved',
      approver: goutham,
      decidedBy: goutham,
      decidedAt: new Date(Date.UTC(2026, 9, 20, 10, 0, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 19, 14, 30, 0)),
    });
  }

  if (jyothi && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: jyothi,
      leaveType: sl,
      startDate: todayStart,
      endDate: todayEnd,
      workingDays: 1,
      isHalfDay: false,
      reason: 'Doctor consultation & diagnostic health check',
      status: 'approved',
      approver: goutham,
      decidedBy: goutham,
      decidedAt: new Date(Date.UTC(2026, 9, 21, 8, 30, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 21, 8, 0, 0)),
    });
  }

  if (rachana && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: rachana,
      leaveType: cl,
      startDate: todayStart,
      endDate: todayEnd,
      workingDays: 1,
      isHalfDay: false,
      reason: 'Urgent domestic personal errand',
      status: 'approved',
      approver: goutham,
      decidedBy: goutham,
      decidedAt: new Date(Date.UTC(2026, 9, 20, 16, 0, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 20, 15, 0, 0)),
    });
  }

  // =========================================================================
  // 2. PENDING APPROVAL LEAVE REQUESTS (6 Pending)
  // =========================================================================
  if (pratheeksha && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: pratheeksha,
      leaveType: cl,
      startDate: new Date(Date.UTC(2026, 9, 26, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 9, 26, 23, 59, 59)),
      workingDays: 1,
      isHalfDay: false,
      reason: 'Family function & festival celebrations in Udupi',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 9, 0, 0)),
    });
  }

  if (aravinda && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: aravinda,
      leaveType: al,
      startDate: new Date(Date.UTC(2026, 10, 4, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 6, 23, 59, 59)),
      workingDays: 3,
      isHalfDay: false,
      reason: 'Annual family tour to Coastal Karnataka & Gokarna',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 9, 30, 0)),
    });
  }

  if (anish && aakanksha) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: anish,
      leaveType: cl,
      startDate: new Date(Date.UTC(2026, 10, 12, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 13, 23, 59, 59)),
      workingDays: 2,
      isHalfDay: false,
      reason: 'ISO Quality Audit Masterclass and Certification Workshop',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 10, 0, 0)),
    });
  }

  if (goutham && melroy) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: goutham,
      leaveType: al,
      startDate: new Date(Date.UTC(2026, 10, 9, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 12, 23, 59, 59)),
      workingDays: 3,
      isHalfDay: false,
      reason: 'Deepavali festival celebration at hometown with family',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 10, 30, 0)),
    });
  }

  if (sinchana && melroy) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: sinchana,
      leaveType: cl,
      startDate: new Date(Date.UTC(2026, 10, 2, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 2, 23, 59, 59)),
      workingDays: 1,
      isHalfDay: false,
      reason: 'Bank compliance and statutory audit tax documentation submission',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 11, 0, 0)),
    });
  }

  if (sahana && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: sahana,
      leaveType: sl,
      startDate: new Date(Date.UTC(2026, 9, 23, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 9, 23, 23, 59, 59)),
      workingDays: 1,
      isHalfDay: false,
      reason: 'Pre-scheduled dental surgery and post-procedure recovery',
      status: 'pending',
      submittedAt: new Date(Date.UTC(2026, 9, 21, 11, 15, 0)),
    });
  }

  // =========================================================================
  // 3. UPCOMING APPROVED LEAVES (NOVEMBER & DECEMBER 2026)
  // =========================================================================
  if (rowin && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: rowin,
      leaveType: al,
      startDate: new Date(Date.UTC(2026, 10, 16, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 17, 23, 59, 59)),
      workingDays: 2,
      isHalfDay: false,
      reason: 'Sibling convocation ceremony and family celebration',
      status: 'approved',
      approver: goutham,
      decidedBy: goutham,
      decidedAt: new Date(Date.UTC(2026, 9, 15, 14, 0, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 15, 10, 0, 0)),
    });
  }

  if (melroy && sudarshan) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: melroy,
      leaveType: al,
      startDate: new Date(Date.UTC(2026, 11, 28, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 11, 30, 23, 59, 59)),
      workingDays: 3,
      isHalfDay: false,
      reason: 'Year-end board recess and strategic annual holiday',
      status: 'approved',
      approver: sudarshan,
      decidedBy: sudarshan,
      decidedAt: new Date(Date.UTC(2026, 9, 10, 11, 0, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 10, 9, 0, 0)),
    });
  }

  if (kishan && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: kishan,
      leaveType: cl,
      startDate: new Date(Date.UTC(2026, 10, 23, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, 10, 24, 23, 59, 59)),
      workingDays: 2,
      isHalfDay: false,
      reason: 'Attending regional robotics and open-source symposium',
      status: 'approved',
      approver: goutham,
      decidedBy: goutham,
      decidedAt: new Date(Date.UTC(2026, 9, 18, 15, 0, 0)),
      submittedAt: new Date(Date.UTC(2026, 9, 18, 12, 0, 0)),
    });
  }

  // =========================================================================
  // 4. HISTORICAL APPROVED LEAVES (JAN - OCT 2026) ACROSS TEAM
  // =========================================================================
  const pastLeaves = [
    { emp: pratheeksha, lt: cl, s: '2026-01-19', e: '2026-01-20', d: 2, r: 'Post-Sankranti family festival', mgr: goutham },
    { emp: aravinda, lt: sl, s: '2026-02-16', e: '2026-02-17', d: 2, r: 'Seasonal viral flu and rest', mgr: goutham },
    { emp: ankit, lt: cl, s: '2026-03-05', e: '2026-03-05', d: 1, r: 'Personal administrative appointment', mgr: goutham },
    { emp: jyothi, lt: al, s: '2026-03-23', e: '2026-03-25', d: 3, r: 'Post-Ugadi family trip', mgr: goutham },
    { emp: sinchana, lt: cl, s: '2026-04-06', e: '2026-04-06', d: 1, r: 'Fiscal year-end banking paperwork', mgr: melroy },
    { emp: anish, lt: al, s: '2026-05-18', e: '2026-05-21', d: 4, r: 'Family vacation to Goa and South Konkan', mgr: aakanksha },
    { emp: rowin, lt: sl, s: '2026-06-08', e: '2026-06-08', d: 1, r: 'Migraine and eye fatigue recovery', mgr: goutham },
    { emp: rachana, lt: cl, s: '2026-06-22', e: '2026-06-23', d: 2, r: 'Cousin wedding in Mangalore', mgr: goutham },
    { emp: bhavish, lt: al, s: '2026-07-13', e: '2026-07-15', d: 3, r: 'Monsoon photography workshop in Coorg', mgr: melroy },
    { emp: vishwas, lt: sl, s: '2026-08-03', e: '2026-08-04', d: 2, r: 'Gastroenteritis treatment and recovery', mgr: jayaprakash },
    { emp: fencita, lt: cl, s: '2026-08-20', e: '2026-08-21', d: 2, r: 'Attending HR Conclave and talent summit', mgr: rahul },
    { emp: madhavi, lt: al, s: '2026-09-07', e: '2026-09-09', d: 3, r: 'Angel investing and women in tech roundtable', mgr: melroy },
    { emp: ranjini, lt: cl, s: '2026-09-15', e: '2026-09-16', d: 2, r: 'Vinayaka Chaturthi religious rituals at home', mgr: melroy },
    { emp: kishan, lt: al, s: '2026-09-28', e: '2026-09-30', d: 3, r: 'Cloud infrastructure summit & networking', mgr: goutham },
    { emp: sahana, lt: cl, s: '2026-10-05', e: '2026-10-06', d: 2, r: 'Family pilgrimage to Dharmasthala & Subrahmanya', mgr: goutham },
  ];

  for (const item of pastLeaves) {
    if (!item.emp || !item.mgr) continue;
    const startDate = new Date(`${item.s}T00:00:00.000Z`);
    const endDate = new Date(`${item.e}T23:59:59.000Z`);
    const submitDate = new Date(startDate.getTime() - 86400000 * 3);
    const decideDate = new Date(startDate.getTime() - 86400000 * 2);

    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: item.emp,
      leaveType: item.lt,
      startDate,
      endDate,
      workingDays: item.d,
      isHalfDay: false,
      reason: item.r,
      status: 'approved',
      approver: item.mgr,
      decidedBy: item.mgr,
      decidedAt: decideDate,
      submittedAt: submitDate,
    });
  }

  // =========================================================================
  // 5. REJECTED LEAVE REQUESTS
  // =========================================================================
  if (rowin && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: rowin,
      leaveType: al,
      startDate: new Date('2026-08-17T00:00:00.000Z'),
      endDate: new Date('2026-08-21T23:59:59.000Z'),
      workingDays: 5,
      isHalfDay: false,
      reason: 'Extended travel during client deployment freeze week',
      status: 'rejected',
      approver: goutham,
      decidedBy: goutham,
      decisionReason: 'Sprint release freeze week — team coverage mandatory during client deployment',
      decidedAt: new Date('2026-08-10T11:00:00.000Z'),
      submittedAt: new Date('2026-08-09T14:00:00.000Z'),
    });
  }

  if (vishwas && jayaprakash) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: vishwas,
      leaveType: cl,
      startDate: new Date('2026-09-14T00:00:00.000Z'),
      endDate: new Date('2026-09-16T23:59:59.000Z'),
      workingDays: 3,
      isHalfDay: false,
      reason: 'Personal outing during trainee milestone review',
      status: 'rejected',
      approver: jayaprakash,
      decidedBy: jayaprakash,
      decisionReason: 'Trainee quarterly milestone evaluation scheduled on these dates; please reschedule',
      decidedAt: new Date('2026-09-11T10:00:00.000Z'),
      submittedAt: new Date('2026-09-10T09:00:00.000Z'),
    });
  }

  // =========================================================================
  // 6. CANCELLED / REVOKED LEAVES
  // =========================================================================
  if (rachana && goutham) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: rachana,
      leaveType: cl,
      startDate: new Date('2026-09-04T00:00:00.000Z'),
      endDate: new Date('2026-09-04T23:59:59.000Z'),
      workingDays: 1,
      isHalfDay: false,
      reason: 'Planned errand in Kundapura (trip postponed)',
      status: 'cancelled',
      cancelledBy: rachana._id,
      cancelledAt: new Date('2026-09-02T16:00:00.000Z'),
      submittedAt: new Date('2026-09-01T10:00:00.000Z'),
    });
  }

  if (bhavish && melroy) {
    leaveDefinitions.push({
      requestNumber: genReqNum(),
      employee: bhavish,
      leaveType: al,
      startDate: new Date('2026-10-05T00:00:00.000Z'),
      endDate: new Date('2026-10-06T23:59:59.000Z'),
      workingDays: 2,
      isHalfDay: false,
      reason: 'Short vacation (Revoked by admin due to urgent product launch collateral)',
      status: 'cancelled',
      approver: melroy,
      cancelledBy: melroy._id,
      cancelledAt: new Date('2026-10-04T12:00:00.000Z'),
      approverComments: 'Revoked by super admin due to emergency client product launch; compensatory leave credited',
      submittedAt: new Date('2026-09-25T11:00:00.000Z'),
    });
  }

  // Insert all leave requests
  logger.info(`Inserting ${leaveDefinitions.length} enterprise leave requests...`);
  const insertedLeaves = await LeaveRequest.insertMany(
    leaveDefinitions.map((ld) => ({
      ...ld,
      employee: ld.employee._id,
      leaveType: ld.leaveType._id,
      approver: ld.approver ? ld.approver._id : null,
      decidedBy: ld.decidedBy ? ld.decidedBy._id : null,
    }))
  );
  logger.info(`Successfully created ${insertedLeaves.length} leave requests.`);

  // =========================================================================
  // 7. RECALCULATE LEAVE BALANCES FOR ALL 21 EMPLOYEES
  // =========================================================================
  logger.info('Recalculating 2026 leave balances for all employees...');
  for (const user of users) {
    for (const lt of leaveTypes) {
      // Find all approved days for this user and leave type in 2026
      const approvedLeaves = await LeaveRequest.find({
        employee: user._id,
        leaveType: lt._id,
        status: 'approved',
      });
      const usedDays = approvedLeaves.reduce((sum, r) => sum + (r.workingDays || 0), 0);

      // Find all pending days
      const pendingLeaves = await LeaveRequest.find({
        employee: user._id,
        leaveType: lt._id,
        status: 'pending',
      });
      const pendingDays = pendingLeaves.reduce((sum, r) => sum + (r.workingDays || 0), 0);

      let defaultEntitlement = 12;
      if (lt.code === 'SL') defaultEntitlement = 10;
      if (lt.code === 'AL') defaultEntitlement = 15;
      if (lt.code === 'UL') defaultEntitlement = 30;

      await LeaveBalance.findOneAndUpdate(
        { employee: user._id, leaveType: lt._id, policyYear: CURRENT_YEAR },
        {
          $set: {
            usedDays,
            pendingDays,
            entitlement: defaultEntitlement,
            carryForward: 0,
            adjustments: 0,
          },
        },
        { upsert: true }
      );
    }
  }
  logger.info('Leave balances updated accurately.');

  // =========================================================================
  // 8. SEED NOTIFICATIONS
  // =========================================================================
  const notificationsToSeed: any[] = [];
  // Notify Goutham of pending requests
  if (goutham) {
    notificationsToSeed.push(
      {
        recipient: goutham._id,
        type: 'leave_pending_approval',
        title: 'New Leave Request from Pratheeksha Karkera',
        message: 'Pratheeksha submitted 1 day of Casual Leave for Oct 26, 2026.',
        isRead: false,
      },
      {
        recipient: goutham._id,
        type: 'leave_pending_approval',
        title: 'New Leave Request from Aravinda Acharya J P',
        message: 'Aravinda requested 3 days of Annual Leave from Nov 4 to Nov 6, 2026.',
        isRead: false,
      },
      {
        recipient: goutham._id,
        type: 'leave_approved',
        title: 'Leave Approved',
        message: 'Your leave request LR-2026-EXL-0001 (Ankit Shetty) was logged as approved.',
        isRead: true,
      }
    );
  }

  // Notify Melroy of pending requests
  if (melroy) {
    notificationsToSeed.push(
      {
        recipient: melroy._id,
        type: 'leave_pending_approval',
        title: 'Manager Leave Request from Goutham Kumar',
        message: 'Lead Frontend Engineer Goutham Kumar requested 3 days Annual Leave for Diwali.',
        isRead: false,
      },
      {
        recipient: melroy._id,
        type: 'leave_pending_approval',
        title: 'Leave Request from Sinchana K (Accounts)',
        message: 'Sinchana requested 1 day Casual Leave on Nov 2 for Tax & Audit compliance.',
        isRead: false,
      }
    );
  }

  // Notify employees of approvals
  if (ankit) {
    notificationsToSeed.push({
      recipient: ankit._id,
      type: 'leave_approved',
      title: 'Leave Application Approved',
      message: 'Your Casual Leave for today (Developer Tech Summit) has been approved by Goutham Kumar.',
      isRead: false,
    });
  }

  if (pratheeksha) {
    notificationsToSeed.push({
      recipient: pratheeksha._id,
      type: 'leave_submitted',
      title: 'Leave Application Received',
      message: 'Your leave request for Oct 26 has been submitted to Goutham Kumar for approval.',
      isRead: true,
    });
  }

  await Notification.insertMany(notificationsToSeed);
  logger.info(`Seeded ${notificationsToSeed.length} notifications.`);

  // =========================================================================
  // 9. SEED AUDIT LOGS
  // =========================================================================
  const auditLogsToSeed: any[] = [
    {
      actor: melroy?._id,
      actorEmail: 'melroy.pinto@exeloncircuits.com',
      action: 'auth.login',
      entityType: 'User',
      entityId: melroy?._id,
      description: 'Administrator Melroy Pinto logged in successfully.',
      createdAt: new Date('2026-10-21T08:00:00.000Z'),
    },
    {
      actor: goutham?._id,
      actorEmail: 'goutham.kumar@exeloncircuits.com',
      action: 'leave.approved',
      entityType: 'LeaveRequest',
      description: 'Manager Goutham Kumar approved 1 day Casual Leave for Ankit Shetty.',
      createdAt: new Date('2026-10-20T10:00:00.000Z'),
    },
    {
      actor: goutham?._id,
      actorEmail: 'goutham.kumar@exeloncircuits.com',
      action: 'leave.approved',
      entityType: 'LeaveRequest',
      description: 'Manager Goutham Kumar approved 1 day Sick Leave for Jyothi Y Suvarna.',
      createdAt: new Date('2026-10-21T08:30:00.000Z'),
    },
    {
      actor: pratheeksha?._id,
      actorEmail: 'pratheeksha.karkera@exeloncircuits.com',
      action: 'leave.submitted',
      entityType: 'LeaveRequest',
      description: 'Pratheeksha Karkera submitted Casual Leave application for Oct 26.',
      createdAt: new Date('2026-10-21T09:00:00.000Z'),
    },
    {
      actor: melroy?._id,
      actorEmail: 'melroy.pinto@exeloncircuits.com',
      action: 'leave.override_status',
      entityType: 'LeaveRequest',
      description: 'Super Admin Melroy Pinto revoked leave for Bhavish Shetty due to project launch.',
      createdAt: new Date('2026-10-04T12:00:00.000Z'),
    },
    {
      actor: goutham?._id,
      actorEmail: 'goutham.kumar@exeloncircuits.com',
      action: 'leave.rejected',
      entityType: 'LeaveRequest',
      description: 'Manager Goutham Kumar rejected leave application for Rowin Mathias (Sprint freeze).',
      createdAt: new Date('2026-08-10T11:00:00.000Z'),
    },
    {
      actor: melroy?._id,
      actorEmail: 'melroy.pinto@exeloncircuits.com',
      action: 'holiday.created',
      entityType: 'CompanyHoliday',
      description: 'Super Admin Melroy Pinto verified and synchronized 2026 official holiday schedule.',
      createdAt: new Date('2026-01-02T10:00:00.000Z'),
    },
  ];

  await AuditLog.insertMany(auditLogsToSeed);
  logger.info(`Seeded ${auditLogsToSeed.length} enterprise audit logs.`);

  // =========================================================================
  // 10. UPDATE PROMETHEUS METRIC COUNTERS
  // =========================================================================
  activeUsersGauge.set(users.length);
  const pendingCount = await LeaveRequest.countDocuments({ status: 'pending' });
  pendingApprovalsGauge.set(pendingCount);

  // Increment counters for historical stats
  leaveRequestsTotal.inc({ leave_type: 'CL', status: 'approved' }, 14);
  leaveRequestsTotal.inc({ leave_type: 'SL', status: 'approved' }, 6);
  leaveRequestsTotal.inc({ leave_type: 'AL', status: 'approved' }, 8);
  leaveRequestsTotal.inc({ leave_type: 'CL', status: 'pending' }, 4);
  leaveRequestsTotal.inc({ leave_type: 'AL', status: 'pending' }, 2);
  leaveApprovalsTotal.inc({ decision: 'approved' }, 28);
  leaveApprovalsTotal.inc({ decision: 'rejected' }, 2);
  authAttemptsTotal.inc({ result: 'success' }, 42);
  authAttemptsTotal.inc({ result: 'failure' }, 2);

  logger.info('Prometheus metrics updated with seed metrics.');
  logger.info('Rich enterprise seeding successfully finished!');
}

if (process.argv[1] && process.argv[1].includes('seed-rich-data')) {
  seedRichData()
    .then(() => {
      logger.info('Done');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to seed rich data');
      process.exit(1);
    });
}
