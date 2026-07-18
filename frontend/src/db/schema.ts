import { relations } from 'drizzle-orm';
import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('Citizen'), // Citizen, Volunteer, NGO, Coordinator, Admin, SuperAdmin
  phone: text('phone'),
  organization: text('organization'),
  trustScore: integer('trust_score').notNull().default(100),
  isSuspended: boolean('is_suspended').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Rescues table representing stray/injured/homeless pets reported or rescued
export const rescues = pgTable('rescues', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  species: text('species').notNull(), // dog, cat, bird, other
  injurySeverity: text('injury_severity').notNull(), // Critical, Moderate, Minor, Unknown
  imageUrl: text('image_url'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  address: text('address'),
  status: text('status').notNull().default('Reported'), // Reported, Assigned, En Route, Rescued, In Treatment, Adoption Ready, Adopted
  coordinatorId: integer('coordinator_id').references(() => users.id),
  ngoId: integer('ngo_id').references(() => users.id),
  volunteerId: integer('volunteer_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Rescue logs (tracking state changes & coordinate updates)
export const rescueLogs = pgTable('rescue_logs', {
  id: serial('id').primaryKey(),
  rescueId: integer('rescue_id').references(() => rescues.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  status: text('status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Adoption Applications for rescued animals that are Adoption Ready
export const adoptions = pgTable('adoptions', {
  id: serial('id').primaryKey(),
  rescueId: integer('rescue_id').references(() => rescues.id).notNull(),
  applicantId: integer('applicant_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('Pending'), // Pending, Approved, Rejected
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reportedRescues: many(rescues, { relationName: 'reporter' }),
  coordinatedRescues: many(rescues, { relationName: 'coordinator' }),
  ngoRescues: many(rescues, { relationName: 'ngo' }),
  volunteerRescues: many(rescues, { relationName: 'volunteer' }),
  logs: many(rescueLogs),
  adoptions: many(adoptions),
}));

export const rescuesRelations = relations(rescues, ({ one, many }) => ({
  reporter: one(users, {
    fields: [rescues.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  coordinator: one(users, {
    fields: [rescues.coordinatorId],
    references: [users.id],
    relationName: 'coordinator',
  }),
  ngo: one(users, {
    fields: [rescues.ngoId],
    references: [users.id],
    relationName: 'ngo',
  }),
  volunteer: one(users, {
    fields: [rescues.volunteerId],
    references: [users.id],
    relationName: 'volunteer',
  }),
  logs: many(rescueLogs),
  adoptions: many(adoptions),
}));

export const rescueLogsRelations = relations(rescueLogs, ({ one }) => ({
  rescue: one(rescues, {
    fields: [rescueLogs.rescueId],
    references: [rescues.id],
  }),
  user: one(users, {
    fields: [rescueLogs.userId],
    references: [users.id],
  }),
}));

export const adoptionsRelations = relations(adoptions, ({ one }) => ({
  rescue: one(rescues, {
    fields: [adoptions.rescueId],
    references: [rescues.id],
  }),
  applicant: one(users, {
    fields: [adoptions.applicantId],
    references: [users.id],
  }),
}));
