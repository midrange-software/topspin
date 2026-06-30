CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "branch" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"name" text NOT NULL,
	"sha" text NOT NULL,
	"protected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_repo_name_unique" UNIQUE("repository_id","name")
);
--> statement-breakpoint
CREATE TABLE "commit" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"author_name" text,
	"author_email" text,
	"author_login" text,
	"additions" integer DEFAULT 0,
	"deletions" integer DEFAULT 0,
	"committed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commit_repo_sha_unique" UNIQUE("repository_id","sha")
);
--> statement-breakpoint
CREATE TABLE "github_event" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer,
	"delivery_id" text NOT NULL,
	"event" text NOT NULL,
	"action" text,
	"payload" text NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_event_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE TABLE "github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"organization_id" text NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installation_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "pull_request_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"pull_request_id" text NOT NULL,
	"github_id" integer NOT NULL,
	"author_login" text,
	"body" text NOT NULL,
	"github_created_at" timestamp NOT NULL,
	"github_updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_request_comment_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "pull_request_review" (
	"id" text PRIMARY KEY NOT NULL,
	"pull_request_id" text NOT NULL,
	"github_id" integer NOT NULL,
	"reviewer_login" text,
	"state" text NOT NULL,
	"body" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_request_review_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"github_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"state" text NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"author_login" text,
	"head_branch" text NOT NULL,
	"base_branch" text NOT NULL,
	"head_sha" text NOT NULL,
	"additions" integer DEFAULT 0,
	"deletions" integer DEFAULT 0,
	"changed_files" integer DEFAULT 0,
	"merged_at" timestamp,
	"closed_at" timestamp,
	"github_created_at" timestamp NOT NULL,
	"github_updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_request_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "pr_repo_number_unique" UNIQUE("repository_id","number")
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"github_id" integer NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"private" boolean NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"language" text,
	"description" text,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repository_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "repository_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "jira_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cloud_id" text NOT NULL,
	"cloud_url" text NOT NULL,
	"cloud_name" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"scopes" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jira_connection_org_cloud_unique" UNIQUE("organization_id","cloud_id")
);
--> statement-breakpoint
CREATE TABLE "jira_event" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jira_project" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"project_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"project_type" text,
	"style" text,
	"board_id" integer,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jira_project_connection_project_unique" UNIQUE("connection_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "jira_sprint" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"sprint_id" integer NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL,
	"goal" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"complete_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jira_sprint_sprint_id_unique" UNIQUE("sprint_id")
);
--> statement-breakpoint
CREATE TABLE "jira_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"from_status_category" text,
	"to_status_category" text NOT NULL,
	"author_account_id" text,
	"author_name" text,
	"changed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jira_ticket_sprint" (
	"ticket_id" text NOT NULL,
	"sprint_id" text NOT NULL,
	CONSTRAINT "jira_ticket_sprint_ticket_id_sprint_id_pk" PRIMARY KEY("ticket_id","sprint_id")
);
--> statement-breakpoint
CREATE TABLE "jira_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"ticket_id" text NOT NULL,
	"key" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"status_category" text NOT NULL,
	"priority" text,
	"assignee_account_id" text,
	"assignee_name" text,
	"reporter_account_id" text,
	"reporter_name" text,
	"epic_key" text,
	"parent_key" text,
	"story_points" integer,
	"labels" text[],
	"jira_created_at" timestamp NOT NULL,
	"jira_updated_at" timestamp NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jira_ticket_ticket_id_unique" UNIQUE("ticket_id"),
	CONSTRAINT "jira_ticket_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pr_jira_link" (
	"pr_id" text NOT NULL,
	"ticket_id" text NOT NULL,
	"matched_key" text NOT NULL,
	"sources" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pr_jira_link_pr_id_ticket_id_pk" PRIMARY KEY("pr_id","ticket_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit" ADD CONSTRAINT "commit_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_comment" ADD CONSTRAINT "pull_request_comment_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_review" ADD CONSTRAINT "pull_request_review_pull_request_id_pull_request_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_repository_id_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_installation_id_github_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_connection" ADD CONSTRAINT "jira_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_event" ADD CONSTRAINT "jira_event_connection_id_jira_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."jira_connection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_project" ADD CONSTRAINT "jira_project_connection_id_jira_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."jira_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_sprint" ADD CONSTRAINT "jira_sprint_project_id_jira_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."jira_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_status_history" ADD CONSTRAINT "jira_status_history_ticket_id_jira_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."jira_ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_ticket_sprint" ADD CONSTRAINT "jira_ticket_sprint_ticket_id_jira_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."jira_ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_ticket_sprint" ADD CONSTRAINT "jira_ticket_sprint_sprint_id_jira_sprint_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."jira_sprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_ticket" ADD CONSTRAINT "jira_ticket_project_id_jira_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."jira_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_jira_link" ADD CONSTRAINT "pr_jira_link_pr_id_pull_request_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_jira_link" ADD CONSTRAINT "pr_jira_link_ticket_id_jira_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."jira_ticket"("id") ON DELETE cascade ON UPDATE no action;