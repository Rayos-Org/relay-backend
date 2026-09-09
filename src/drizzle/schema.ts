import { pgTable, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';

export const credentialLookup = pgTable('credential_lookup', {
  credential_id: text('credential_id').primaryKey(),
  wallet_address: varchar('wallet_address', { length: 56 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  session_id: text('session_id').primaryKey(),
  wallet_address: varchar('wallet_address', { length: 56 }).notNull(),
  scope: text('scope').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  revoked_at: timestamp('revoked_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const recoveryProposals = pgTable('recovery_proposals', {
  proposal_id: text('proposal_id').primaryKey(),
  wallet_address: varchar('wallet_address', { length: 56 }).notNull(),
  new_signer: varchar('new_signer', { length: 56 }).notNull(),
  approvals: jsonb('approvals').default([]).notNull(),
  timelock_expires_at: timestamp('timelock_expires_at').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // pending | approved | executed | cancelled | expired
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
