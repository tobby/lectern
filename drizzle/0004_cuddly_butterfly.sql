ALTER TABLE "courses" ADD COLUMN "source" varchar(10) DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "input_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "output_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "study_aids" ADD COLUMN "manually_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education_level" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "field_of_study" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "learning_goal" varchar(20);