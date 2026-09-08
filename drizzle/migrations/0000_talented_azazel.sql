CREATE TABLE IF NOT EXISTS "credential_lookup" (
	"credential_id" text PRIMARY KEY NOT NULL,
	"wallet_address" varchar(56) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_proposals" (
	"proposal_id" text PRIMARY KEY NOT NULL,
	"wallet_address" varchar(56) NOT NULL,
	"new_signer" varchar(56) NOT NULL,
	"approvals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timelock_expires_at" timestamp NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"wallet_address" varchar(56) NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
