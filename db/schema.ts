import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";

export const leads=sqliteTable("leads",{
  id:text("id").primaryKey(),intent:text("intent").notNull(),name:text("name").notNull(),
  email:text("email").notNull(),organization:text("organization").notNull().default(""),
  role:text("role").notNull().default(""),message:text("message").notNull(),
  destination:text("destination").notNull(),consentVersion:text("consent_version").notNull(),
  deliveryStatus:text("delivery_status").notNull().default("accepted"),
  deliveryChannel:text("delivery_channel"),deliveryAttempts:integer("delivery_attempts").notNull().default(0),
  lastError:text("last_error"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
});

export const leadEvents=sqliteTable("lead_events",{
  id:integer("id").primaryKey({autoIncrement:true}),leadId:text("lead_id").notNull(),
  event:text("event").notNull(),channel:text("channel"),detail:text("detail"),createdAt:text("created_at").notNull(),
});
