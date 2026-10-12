// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable('projects', { id:text('id').primaryKey(), owner:text('owner').notNull(), name:text('name').notNull(), config:text('config').notNull(), createdAt:text('created_at').notNull() });
export const versions = sqliteTable('versions', { id:text('id').primaryKey(), projectId:text('project_id').notNull().references(()=>projects.id), version:integer('version').notNull(), config:text('config').notNull(), createdAt:text('created_at').notNull() }, t=>[uniqueIndex('project_version').on(t.projectId,t.version)]);
export const assets = sqliteTable('assets', { id:text('id').primaryKey(), owner:text('owner').notNull(), name:text('name').notNull(), type:text('type').notNull() });
