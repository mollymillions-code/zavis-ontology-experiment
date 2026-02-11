import { pgTable, text, numeric, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

// ===== CLIENTS =====
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  salesPartner: text('sales_partner'),
  status: text('status').notNull().default('active'),
  pricingModel: text('pricing_model').notNull().default('per_seat'),
  perSeatCost: numeric('per_seat_cost', { precision: 10, scale: 2 }),
  seatCount: integer('seat_count'),
  billingCycle: text('billing_cycle'),
  plan: text('plan'),
  discount: numeric('discount', { precision: 5, scale: 2 }).default('0'),
  mrr: numeric('mrr', { precision: 10, scale: 2 }).notNull().default('0'),
  oneTimeRevenue: numeric('one_time_revenue', { precision: 10, scale: 2 }).notNull().default('0'),
  annualRunRate: numeric('annual_run_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  onboardingDate: text('onboarding_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== RECEIVABLES =====
export const receivables = pgTable('receivables', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
});

// ===== MONTHLY SNAPSHOTS =====
export const monthlySnapshots = pgTable('monthly_snapshots', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  month: text('month').notNull().unique(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  data: jsonb('data').notNull(),
});

// ===== WHAT-IF SCENARIOS =====
export const whatifScenarios = pgTable('whatif_scenarios', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  modifiedPerSeatPrice: numeric('modified_per_seat_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== MONTHLY COSTS =====
export const monthlyCosts = pgTable('monthly_costs', {
  id: text('id').primaryKey(),
  month: text('month').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull().default('actual'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
