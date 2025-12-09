import { pgTable, serial, varchar, boolean, timestamp, integer, date, decimal, text, time, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Tabel: shift
export const shift = pgTable('shift', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  toleranceLate: integer('tolerance_late').default(15), // dalam menit
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('shift_name_idx').on(table.name),
}));

// Tabel: users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nip: varchar('nip', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('employee'), // 'admin' atau 'employee'
  shiftId: integer('shift_id').references(() => shift.id),
  isActive: boolean('is_active').default(true),
  faceEmbedding: text('face_embedding'), // Store face embedding as JSON string
  faceRegisteredAt: timestamp('face_registered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nipIdx: uniqueIndex('users_nip_idx').on(table.nip),
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Tabel: attendance
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  date: date('date').notNull(),
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  checkInLat: decimal('check_in_lat', { precision: 10, scale: 8 }),
  checkInLng: decimal('check_in_lng', { precision: 11, scale: 8 }),
  checkOutLat: decimal('check_out_lat', { precision: 10, scale: 8 }),
  checkOutLng: decimal('check_out_lng', { precision: 11, scale: 8 }),
  checkInFaceVerified: boolean('check_in_face_verified').default(false),
  checkInFaceSimilarity: decimal('check_in_face_similarity', { precision: 5, scale: 4 }),
  checkOutFaceVerified: boolean('check_out_face_verified').default(false),
  checkOutFaceSimilarity: decimal('check_out_face_similarity', { precision: 5, scale: 4 }),
  status: varchar('status', { length: 20 }).notNull(), // 'hadir', 'terlambat', 'izin', 'sakit', 'alpha'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userDateIdx: uniqueIndex('attendance_user_date_idx').on(table.userId, table.date),
}));

// Tabel: activity_log
export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  description: text('description'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabel: company_settings
export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabel: shift_schedule (jadwal shift karyawan)
export const shiftSchedule = pgTable('shift_schedule', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  shiftId: integer('shift_id').notNull().references(() => shift.id),
  scheduleDate: date('schedule_date').notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id), // admin yang membuat
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userDateIdx: uniqueIndex('shift_schedule_user_date_idx').on(table.userId, table.scheduleDate),
}));

// Tabel: office_locations (lokasi kantor)
export const officeLocations = pgTable('office_locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  address: text('address'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  radius: integer('radius').notNull().default(100), // dalam meter
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  shift: one(shift, {
    fields: [users.shiftId],
    references: [shift.id],
  }),
  attendances: many(attendance),
  activityLogs: many(activityLog),
}));

export const shiftRelations = relations(shift, ({ many }) => ({
  users: many(users),
  schedules: many(shiftSchedule),
}));

export const shiftScheduleRelations = relations(shiftSchedule, ({ one }) => ({
  user: one(users, {
    fields: [shiftSchedule.userId],
    references: [users.id],
  }),
  shift: one(shift, {
    fields: [shiftSchedule.shiftId],
    references: [shift.id],
  }),
  creator: one(users, {
    fields: [shiftSchedule.createdBy],
    references: [users.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));
