import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";

export const leads=sqliteTable("leads",{
  id:text("id").primaryKey(),intent:text("intent").notNull(),name:text("name").notNull(),
  email:text("email").notNull(),organization:text("organization").notNull().default(""),
  role:text("role").notNull().default(""),message:text("message").notNull(),
  destination:text("destination").notNull(),consentVersion:text("consent_version").notNull(),
  deliveryStatus:text("delivery_status").notNull().default("accepted"),
  deliveryChannel:text("delivery_channel"),deliveryAttempts:integer("delivery_attempts").notNull().default(0),
  lastError:text("last_error"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
  correlationId:text("correlation_id"),nextAttemptAt:text("next_attempt_at"),
  leaseOwner:text("lease_owner"),leaseToken:text("lease_token"),leaseExpiresAt:text("lease_expires_at"),
  retentionUntil:text("retention_until"),anonymizedAt:text("anonymized_at"),
  legalHold:integer("legal_hold").notNull().default(0),
});

export const operationTokenJti=sqliteTable("operation_token_jti",{
  jti:text("jti").primaryKey(),subject:text("subject").notNull(),
  expiresAt:text("expires_at").notNull(),consumedAt:text("consumed_at").notNull(),
});

export const connectorCircuit=sqliteTable("connector_circuit",{
  connector:text("connector").primaryKey(),state:text("state").notNull().default("closed"),
  failures:integer("failures").notNull().default(0),openedAt:text("opened_at"),
  probeLease:text("probe_lease"),updatedAt:text("updated_at").notNull(),
});

export const prototypeAuditEvents=sqliteTable("prototype_audit_events",{
  id:integer("id").primaryKey({autoIncrement:true}),correlationId:text("correlation_id").notNull(),
  actor:text("actor").notNull(),action:text("action").notNull(),resource:text("resource").notNull(),
  outcome:text("outcome").notNull(),previousHash:text("previous_hash").notNull(),
  eventHash:text("event_hash").notNull().unique(),createdAt:text("created_at").notNull(),
});

export const leadEvents=sqliteTable("lead_events",{
  id:integer("id").primaryKey({autoIncrement:true}),leadId:text("lead_id").notNull(),
  event:text("event").notNull(),channel:text("channel"),detail:text("detail"),createdAt:text("created_at").notNull(),
});

export const siteEvents=sqliteTable("site_events",{
  id:integer("id").primaryKey({autoIncrement:true}),
  event:text("event").notNull(),path:text("path").notNull().default(""),
  properties:text("properties").notNull().default("{}"),
  createdAt:text("created_at").notNull(),
});
