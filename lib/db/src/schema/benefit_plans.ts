import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { carriersTable } from "./carriers";
import { employersTable } from "./employers";

export const benefitPlansTable = pgTable("benefit_plans", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").references(() => employersTable.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  carrierId: integer("carrier_id").notNull().references(() => carriersTable.id),
  groupNumber: text("group_number"),
  planYear: text("plan_year"),
  effectiveDate: text("effective_date"),
  renewalDate: text("renewal_date"),
  employeeCost: numeric("employee_cost", { precision: 10, scale: 2 }),
  employerCost: numeric("employer_cost", { precision: 10, scale: 2 }),
  deductible: numeric("deductible", { precision: 10, scale: 2 }),
  outOfPocketMax: numeric("out_of_pocket_max", { precision: 10, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBenefitPlanSchema = createInsertSchema(benefitPlansTable).omit({ id: true, createdAt: true });
export type InsertBenefitPlan = z.infer<typeof insertBenefitPlanSchema>;
export type BenefitPlan = typeof benefitPlansTable.$inferSelect;
