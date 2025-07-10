import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  text, 
  integer, 
  timestamp, 
  boolean, 
  jsonb, 
  serial, 
  real,
  varchar,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';

// Scalability plans for tracking infrastructure scaling strategies
export const scalabilityPlans = pgTable('scalability_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // User scaling parameters
  currentUsers: integer('current_users').notNull(),
  targetUsers: integer('target_users').notNull(),
  timeframe: varchar('timeframe', { length: 50 }).notNull(),
  
  // Plan data
  plan: jsonb('plan').notNull(), // Complete scalability plan object
  
  // Status tracking
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  // Status options: draft, approved, in_progress, completed, cancelled, archived
  
  // Implementation progress
  progress: real('progress').default(0).notNull(), // 0-100 percentage
  currentPhase: varchar('current_phase', { length: 50 }),
  
  // Costs and budgets
  estimatedCost: integer('estimated_cost'), // Monthly cost in cents
  actualCost: integer('actual_cost'), // Actual monthly cost in cents
  migrationCost: integer('migration_cost'), // One-time migration cost in cents
  
  // Metrics and performance
  performanceMetrics: jsonb('performance_metrics'),
  securityScore: real('security_score'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  archivedAt: timestamp('archived_at'),
  
  // User who created the plan
  createdBy: varchar('created_by', { length: 255 }),
  approvedBy: varchar('approved_by', { length: 255 }),
}, (table) => ({
  statusIdx: index('scalability_plans_status_idx').on(table.status),
  currentUsersIdx: index('scalability_plans_current_users_idx').on(table.currentUsers),
  targetUsersIdx: index('scalability_plans_target_users_idx').on(table.targetUsers),
  createdAtIdx: index('scalability_plans_created_at_idx').on(table.createdAt),
}));

// Scalability milestones for tracking progress
export const scalabilityMilestones = pgTable('scalability_milestones', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }).notNull(),
  
  // Milestone details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  targetUsers: integer('target_users').notNull(),
  
  // Status and progress
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // Status options: pending, in_progress, completed, failed, skipped
  progress: real('progress').default(0).notNull(),
  
  // Implementation details
  requirements: jsonb('requirements'),
  deliverables: jsonb('deliverables'),
  risks: jsonb('risks'),
  
  // Timestamps
  scheduledDate: timestamp('scheduled_date'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Assignment
  assignedTo: varchar('assigned_to', { length: 255 }),
}, (table) => ({
  planIdIdx: index('scalability_milestones_plan_id_idx').on(table.planId),
  statusIdx: index('scalability_milestones_status_idx').on(table.status),
  scheduledDateIdx: index('scalability_milestones_scheduled_date_idx').on(table.scheduledDate),
}));

// Infrastructure configurations for tracking current and target infrastructure
export const infrastructureConfigurations = pgTable('infrastructure_configurations', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }).notNull(),
  
  // Configuration type
  type: varchar('type', { length: 20 }).notNull(),
  // Type options: current, target, test, production
  
  // Infrastructure details
  configuration: jsonb('configuration').notNull(),
  
  // Metrics and performance
  performanceMetrics: jsonb('performance_metrics'),
  costs: jsonb('costs'),
  
  // Status
  active: boolean('active').default(false).notNull(),
  validated: boolean('validated').default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  validatedAt: timestamp('validated_at'),
  
  // Environment
  environment: varchar('environment', { length: 20 }).default('development').notNull(),
}, (table) => ({
  planIdIdx: index('infrastructure_configurations_plan_id_idx').on(table.planId),
  typeIdx: index('infrastructure_configurations_type_idx').on(table.type),
  environmentIdx: index('infrastructure_configurations_environment_idx').on(table.environment),
}));

// Performance benchmarks for tracking system performance
export const performanceBenchmarks = pgTable('performance_benchmarks', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }),
  
  // Benchmark details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // User load
  userCount: integer('user_count').notNull(),
  concurrentUsers: integer('concurrent_users'),
  
  // Performance metrics
  responseTime: real('response_time'), // Average response time in ms
  throughput: real('throughput'), // Requests per second
  errorRate: real('error_rate'), // Error rate percentage
  
  // Resource utilization
  cpuUsage: real('cpu_usage'), // CPU usage percentage
  memoryUsage: real('memory_usage'), // Memory usage percentage
  diskUsage: real('disk_usage'), // Disk usage percentage
  networkUsage: real('network_usage'), // Network usage percentage
  
  // Database performance
  dbConnections: integer('db_connections'),
  dbQueryTime: real('db_query_time'), // Average query time in ms
  dbCacheHitRate: real('db_cache_hit_rate'), // Cache hit rate percentage
  
  // Additional metrics
  additionalMetrics: jsonb('additional_metrics'),
  
  // Test configuration
  testConfiguration: jsonb('test_configuration'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  testDate: timestamp('test_date').notNull(),
  
  // Environment and version
  environment: varchar('environment', { length: 20 }).notNull(),
  version: varchar('version', { length: 50 }),
}, (table) => ({
  planIdIdx: index('performance_benchmarks_plan_id_idx').on(table.planId),
  userCountIdx: index('performance_benchmarks_user_count_idx').on(table.userCount),
  testDateIdx: index('performance_benchmarks_test_date_idx').on(table.testDate),
  environmentIdx: index('performance_benchmarks_environment_idx').on(table.environment),
}));

// Cost tracking for monitoring scalability costs
export const scalabilityCosts = pgTable('scalability_costs', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }).notNull(),
  
  // Cost period
  period: varchar('period', { length: 20 }).notNull(),
  // Period options: monthly, quarterly, yearly, one_time
  
  // Cost details
  category: varchar('category', { length: 50 }).notNull(),
  // Category options: infrastructure, software, migration, maintenance, support
  
  // Costs in cents
  estimatedCost: integer('estimated_cost').notNull(),
  actualCost: integer('actual_cost'),
  
  // Cost breakdown
  costBreakdown: jsonb('cost_breakdown'),
  
  // Timestamps
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Notes
  notes: text('notes'),
}, (table) => ({
  planIdIdx: index('scalability_costs_plan_id_idx').on(table.planId),
  periodIdx: index('scalability_costs_period_idx').on(table.period),
  categoryIdx: index('scalability_costs_category_idx').on(table.category),
  periodStartIdx: index('scalability_costs_period_start_idx').on(table.periodStart),
}));

// Risk assessments for tracking scalability risks
export const scalabilityRisks = pgTable('scalability_risks', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }).notNull(),
  
  // Risk details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  // Category options: technical, operational, financial, security, compliance
  
  // Risk assessment
  probability: real('probability').notNull(), // 0-1 scale
  impact: real('impact').notNull(), // 0-1 scale
  severity: varchar('severity', { length: 20 }).notNull(),
  // Severity options: low, medium, high, critical
  
  // Risk management
  mitigation: text('mitigation'),
  status: varchar('status', { length: 20 }).default('identified').notNull(),
  // Status options: identified, assessed, mitigated, resolved, accepted
  
  // Timestamps
  identifiedAt: timestamp('identified_at').defaultNow().notNull(),
  assessedAt: timestamp('assessed_at'),
  mitigatedAt: timestamp('mitigated_at'),
  resolvedAt: timestamp('resolved_at'),
  
  // Assignment
  assignedTo: varchar('assigned_to', { length: 255 }),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
}, (table) => ({
  planIdIdx: index('scalability_risks_plan_id_idx').on(table.planId),
  categoryIdx: index('scalability_risks_category_idx').on(table.category),
  severityIdx: index('scalability_risks_severity_idx').on(table.severity),
  statusIdx: index('scalability_risks_status_idx').on(table.status),
}));

// Capacity planning for tracking system capacity
export const capacityPlanning = pgTable('capacity_planning', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }),
  
  // Capacity details
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  // Resource types: cpu, memory, disk, network, database, cache
  
  // Capacity metrics
  currentCapacity: real('current_capacity').notNull(),
  targetCapacity: real('target_capacity').notNull(),
  utilizationRate: real('utilization_rate'), // Current utilization percentage
  
  // Scaling parameters
  scaleThreshold: real('scale_threshold'), // Threshold for scaling trigger
  scaleFactor: real('scale_factor'), // Factor by which to scale
  
  // Predictions
  predictedGrowth: real('predicted_growth'), // Predicted growth rate
  capacityBuffer: real('capacity_buffer'), // Buffer capacity percentage
  
  // Additional data
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Environment
  environment: varchar('environment', { length: 20 }).default('production').notNull(),
}, (table) => ({
  planIdIdx: index('capacity_planning_plan_id_idx').on(table.planId),
  resourceTypeIdx: index('capacity_planning_resource_type_idx').on(table.resourceType),
  environmentIdx: index('capacity_planning_environment_idx').on(table.environment),
}));

// Scalability events for tracking important events
export const scalabilityEvents = pgTable('scalability_events', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => scalabilityPlans.id, { onDelete: 'cascade' }),
  
  // Event details
  eventType: varchar('event_type', { length: 50 }).notNull(),
  // Event types: scaling, migration, optimization, incident, milestone
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  // Event data
  eventData: jsonb('event_data'),
  
  // Impact assessment
  impact: varchar('impact', { length: 20 }),
  // Impact levels: low, medium, high, critical
  
  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(),
  // Status options: active, resolved, archived
  
  // Timestamps
  eventDate: timestamp('event_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  
  // Assignment
  reportedBy: varchar('reported_by', { length: 255 }),
  assignedTo: varchar('assigned_to', { length: 255 }),
}, (table) => ({
  planIdIdx: index('scalability_events_plan_id_idx').on(table.planId),
  eventTypeIdx: index('scalability_events_event_type_idx').on(table.eventType),
  eventDateIdx: index('scalability_events_event_date_idx').on(table.eventDate),
  statusIdx: index('scalability_events_status_idx').on(table.status),
}));

// Export all tables
export const scalabilityTables = {
  scalabilityPlans,
  scalabilityMilestones,
  infrastructureConfigurations,
  performanceBenchmarks,
  scalabilityCosts,
  scalabilityRisks,
  capacityPlanning,
  scalabilityEvents,
};

// Types for TypeScript
export type ScalabilityPlan = typeof scalabilityPlans.$inferSelect;
export type NewScalabilityPlan = typeof scalabilityPlans.$inferInsert;

export type ScalabilityMilestone = typeof scalabilityMilestones.$inferSelect;
export type NewScalabilityMilestone = typeof scalabilityMilestones.$inferInsert;

export type InfrastructureConfiguration = typeof infrastructureConfigurations.$inferSelect;
export type NewInfrastructureConfiguration = typeof infrastructureConfigurations.$inferInsert;

export type PerformanceBenchmark = typeof performanceBenchmarks.$inferSelect;
export type NewPerformanceBenchmark = typeof performanceBenchmarks.$inferInsert;

export type ScalabilityCost = typeof scalabilityCosts.$inferSelect;
export type NewScalabilityCost = typeof scalabilityCosts.$inferInsert;

export type ScalabilityRisk = typeof scalabilityRisks.$inferSelect;
export type NewScalabilityRisk = typeof scalabilityRisks.$inferInsert;

export type CapacityPlanning = typeof capacityPlanning.$inferSelect;
export type NewCapacityPlanning = typeof capacityPlanning.$inferInsert;

export type ScalabilityEvent = typeof scalabilityEvents.$inferSelect;
export type NewScalabilityEvent = typeof scalabilityEvents.$inferInsert;