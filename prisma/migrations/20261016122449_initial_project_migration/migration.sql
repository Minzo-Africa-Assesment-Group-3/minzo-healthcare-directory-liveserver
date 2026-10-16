-- PostGIS must be available before geography columns are created.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "BusinessClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessClaimDocumentStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'ATTACHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessRegistrationDocumentStatus" AS ENUM ('PENDING_UPLOAD', 'ATTACHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessMediaBatchStatus" AS ENUM ('UPLOADING', 'PENDING_REVIEW', 'REVIEWED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BusinessMediaStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "BusinessLocationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "BusinessMembershipRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "BusinessRecordSource" AS ENUM ('SELF_REGISTERED', 'IMPORTED', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "BusinessStaffProfession" AS ENUM ('GENERAL_PRACTITIONER', 'DENTIST', 'NURSE', 'PHARMACIST', 'PEDIATRICIAN', 'OPHTHALMOLOGIST', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessStaffVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "ReviewModerationStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewModerationActorType" AS ENUM ('ADMIN', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "ReviewModerationDecision" AS ENUM ('APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessContactMessageStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportedEntityType" AS ENUM ('BUSINESS_LOCATION', 'BUSINESS_STAFF_MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "RefreshTokenRevocationReason" AS ENUM ('ROTATED', 'LOGOUT', 'REUSE_DETECTED', 'PASSWORD_CHANGED', 'ADMIN_REVOKED');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(200),
    "slug" VARCHAR(220) NOT NULL,
    "registration_number" VARCHAR(100),
    "source" "BusinessRecordSource" NOT NULL DEFAULT 'SELF_REGISTERED',
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "verification_status" "BusinessVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_admin_id" UUID,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" VARCHAR(1000),
    "registration_document_key" VARCHAR(500),
    "registration_document_original_name" VARCHAR(255),
    "registration_document_mime_type" VARCHAR(100),
    "registration_document_size_bytes" INTEGER,
    "registration_document_uploaded_at" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_locations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "facility_type" VARCHAR(100),
    "contact_email" VARCHAR(320),
    "contact_phone" VARCHAR(30),
    "website_url" VARCHAR(500),
    "description" TEXT,
    "address_line" VARCHAR(255),
    "county" VARCHAR(100),
    "city_or_town" VARCHAR(100),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "location" geography(Point, 4326),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Africa/Monrovia',
    "status" "BusinessLocationStatus" NOT NULL DEFAULT 'DRAFT',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_location_opening_periods" (
    "id" UUID NOT NULL,
    "business_location_id" UUID NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "opens_at_minutes" INTEGER NOT NULL,
    "closes_at_minutes" INTEGER NOT NULL,
    "closes_next_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_location_opening_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_memberships" (
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "role" "BusinessMembershipRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateTable
CREATE TABLE "business_claims" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "claimant_user_id" UUID NOT NULL,
    "requested_role" "BusinessMembershipRole" NOT NULL,
    "status" "BusinessClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claimant_note" TEXT,
    "evidence_document_key" VARCHAR(500) NOT NULL,
    "evidence_document_original_name" VARCHAR(255) NOT NULL,
    "evidence_document_mime_type" VARCHAR(100) NOT NULL,
    "evidence_document_size_bytes" INTEGER NOT NULL,
    "evidence_document_id" UUID,
    "reviewed_by_admin_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_claim_documents" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "bucket" VARCHAR(63) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "declared_mime_type" VARCHAR(100) NOT NULL,
    "declared_size_bytes" INTEGER NOT NULL,
    "verified_mime_type" VARCHAR(100),
    "verified_size_bytes" INTEGER,
    "status" "BusinessClaimDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "upload_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6),
    "attached_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_claim_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_registration_documents" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "bucket" VARCHAR(63) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "declared_mime_type" VARCHAR(100) NOT NULL,
    "declared_size_bytes" INTEGER NOT NULL,
    "verified_mime_type" VARCHAR(100),
    "verified_size_bytes" INTEGER,
    "status" "BusinessRegistrationDocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "upload_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6),
    "attached_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_registration_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_media_batches" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "status" "BusinessMediaBatchStatus" NOT NULL DEFAULT 'UPLOADING',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_media_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_media" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "reviewed_by_admin_id" UUID,
    "bucket" VARCHAR(63) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "declared_mime_type" VARCHAR(100) NOT NULL,
    "declared_size_bytes" INTEGER NOT NULL,
    "verified_mime_type" VARCHAR(100),
    "verified_size_bytes" INTEGER,
    "alt_text" VARCHAR(255),
    "status" "BusinessMediaStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "upload_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(500),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_staff_members" (
    "id" UUID NOT NULL,
    "business_location_id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" VARCHAR(100) NOT NULL,
    "profession" "BusinessStaffProfession" NOT NULL,
    "professional_title" VARCHAR(100),
    "phone" VARCHAR(30),
    "email" VARCHAR(320),
    "years_experience" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "verification_status" "BusinessStaffVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "source" "BusinessRecordSource" NOT NULL DEFAULT 'SELF_REGISTERED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(170) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_location_services" (
    "business_location_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_location_services_pkey" PRIMARY KEY ("business_location_id","service_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stars" SMALLINT NOT NULL,
    "text" TEXT NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderation_status" "ReviewModerationStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_moderation_actions" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "actor_type" "ReviewModerationActorType" NOT NULL,
    "decision" "ReviewModerationDecision" NOT NULL,
    "admin_user_id" UUID,
    "actor_reference" VARCHAR(200),
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_contact_messages" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "sender_user_id" UUID,
    "sender_name" VARCHAR(100) NOT NULL,
    "sender_email" VARCHAR(320),
    "sender_phone" VARCHAR(30),
    "body" TEXT NOT NULL,
    "status" "BusinessContactMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMPTZ(6),
    "read_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "source_file_name" VARCHAR(255) NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_records" (
    "id" UUID NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "source_key" VARCHAR(255) NOT NULL,
    "source_sheet" VARCHAR(100) NOT NULL,
    "source_row" INTEGER NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "entity_type" "ImportedEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counties" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "counties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "county_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deactivated_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_login_challenges" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "otp_digest" VARCHAR(64) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revocation_reason" "RefreshTokenRevocationReason",
    "replaced_by_token_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "admin_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_user_id","role_id")
);

-- CreateTable
CREATE TABLE "admin_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "otp_digest" VARCHAR(64) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revocation_reason" "RefreshTokenRevocationReason",
    "replaced_by_token_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_registration_number_key" ON "businesses"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_registration_document_key_key" ON "businesses"("registration_document_key");

-- CreateIndex
CREATE INDEX "businesses_status_idx" ON "businesses"("status");

-- CreateIndex
CREATE INDEX "businesses_status_display_name_id_idx" ON "businesses"("status", "display_name", "id");

-- CreateIndex
CREATE INDEX "businesses_verification_status_idx" ON "businesses"("verification_status");

-- CreateIndex
CREATE INDEX "businesses_verified_by_admin_id_idx" ON "businesses"("verified_by_admin_id");

-- CreateIndex
CREATE INDEX "businesses_reviewed_by_admin_id_idx" ON "businesses"("reviewed_by_admin_id");

-- CreateIndex
CREATE INDEX "business_locations_business_id_status_idx" ON "business_locations"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_locations_county_city_or_town_idx" ON "business_locations"("county", "city_or_town");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_business_id_slug_key" ON "business_locations"("business_id", "slug");

-- CreateIndex
CREATE INDEX "opening_periods_location_day_idx" ON "business_location_opening_periods"("business_location_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "opening_periods_location_day_open_key" ON "business_location_opening_periods"("business_location_id", "day_of_week", "opens_at_minutes");

-- CreateIndex
CREATE INDEX "business_memberships_business_id_idx" ON "business_memberships"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_claims_evidence_document_id_key" ON "business_claims"("evidence_document_id");

-- CreateIndex
CREATE INDEX "business_claims_business_id_status_idx" ON "business_claims"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_claims_claimant_user_id_status_idx" ON "business_claims"("claimant_user_id", "status");

-- CreateIndex
CREATE INDEX "business_claims_status_created_at_idx" ON "business_claims"("status", "created_at");

-- CreateIndex
CREATE INDEX "business_claims_reviewed_by_admin_id_idx" ON "business_claims"("reviewed_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_claim_documents_object_key_key" ON "business_claim_documents"("object_key");

-- CreateIndex
CREATE INDEX "business_claim_documents_owner_user_id_status_idx" ON "business_claim_documents"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "business_claim_documents_status_upload_expires_at_idx" ON "business_claim_documents"("status", "upload_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_registration_documents_object_key_key" ON "business_registration_documents"("object_key");

-- CreateIndex
CREATE INDEX "business_registration_documents_business_id_status_idx" ON "business_registration_documents"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_registration_documents_owner_user_id_status_idx" ON "business_registration_documents"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "business_registration_documents_status_upload_expires_at_idx" ON "business_registration_documents"("status", "upload_expires_at");

-- CreateIndex
CREATE INDEX "business_media_batches_business_id_status_idx" ON "business_media_batches"("business_id", "status");

-- CreateIndex
CREATE INDEX "business_media_batches_uploaded_by_user_id_status_idx" ON "business_media_batches"("uploaded_by_user_id", "status");

-- CreateIndex
CREATE INDEX "business_media_batches_status_created_at_idx" ON "business_media_batches"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_media_object_key_key" ON "business_media"("object_key");

-- CreateIndex
CREATE INDEX "business_media_batch_id_status_idx" ON "business_media"("batch_id", "status");

-- CreateIndex
CREATE INDEX "business_media_business_id_status_sort_order_idx" ON "business_media"("business_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "business_media_reviewed_by_admin_id_idx" ON "business_media"("reviewed_by_admin_id");

-- CreateIndex
CREATE INDEX "business_media_status_upload_expires_at_idx" ON "business_media"("status", "upload_expires_at");

-- CreateIndex
CREATE INDEX "business_staff_members_business_location_id_profession_idx" ON "business_staff_members"("business_location_id", "profession");

-- CreateIndex
CREATE INDEX "business_staff_members_user_id_idx" ON "business_staff_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_name_id_idx" ON "services"("name", "id");

-- CreateIndex
CREATE INDEX "services_name_search_trgm_idx" ON "services" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "business_location_services_business_location_id_idx" ON "business_location_services"("business_location_id");

-- CreateIndex
CREATE INDEX "business_location_services_service_id_idx" ON "business_location_services"("service_id");

-- CreateIndex
CREATE INDEX "reviews_business_id_status_submitted_at_idx" ON "reviews"("business_id", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "reviews_user_id_status_idx" ON "reviews"("user_id", "status");

-- CreateIndex
CREATE INDEX "reviews_moderation_status_submitted_at_idx" ON "reviews"("moderation_status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_business_id_user_id_key" ON "reviews"("business_id", "user_id");

-- CreateIndex
CREATE INDEX "review_moderation_actions_review_id_created_at_idx" ON "review_moderation_actions"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "review_moderation_actions_admin_user_id_idx" ON "review_moderation_actions"("admin_user_id");

-- CreateIndex
CREATE INDEX "business_contact_messages_business_id_status_created_at_idx" ON "business_contact_messages"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "business_contact_messages_sender_user_id_created_at_idx" ON "business_contact_messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "business_contact_messages_read_by_user_id_idx" ON "business_contact_messages"("read_by_user_id");

-- CreateIndex
CREATE INDEX "import_batches_source_started_at_idx" ON "import_batches"("source", "started_at");

-- CreateIndex
CREATE INDEX "imported_records_entity_type_entity_id_idx" ON "imported_records"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "imported_records_source_source_key_key" ON "imported_records"("source", "source_key");

-- CreateIndex
CREATE UNIQUE INDEX "imported_records_import_batch_id_source_sheet_source_row_key" ON "imported_records"("import_batch_id", "source_sheet", "source_row");

-- CreateIndex
CREATE UNIQUE INDEX "counties_name_key" ON "counties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "counties_slug_key" ON "counties"("slug");

-- CreateIndex
CREATE INDEX "counties_name_search_trgm_idx" ON "counties" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "cities_county_id_is_active_name_id_idx" ON "cities"("county_id", "is_active", "name", "id");

-- CreateIndex
CREATE INDEX "cities_name_search_trgm_idx" ON "cities" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "cities_county_id_slug_key" ON "cities"("county_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_login_challenges_admin_user_id_idx" ON "admin_login_challenges"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_login_challenges_expires_at_idx" ON "admin_login_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_hash_key" ON "admin_refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_replaced_by_token_id_key" ON "admin_refresh_tokens"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_admin_user_id_idx" ON "admin_refresh_tokens"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_family_id_idx" ON "admin_refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_expires_at_idx" ON "admin_refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_name_key" ON "admin_permissions"("name");

-- CreateIndex
CREATE INDEX "admin_user_roles_role_id_idx" ON "admin_user_roles"("role_id");

-- CreateIndex
CREATE INDEX "admin_role_permissions_permission_id_idx" ON "admin_role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "login_challenges_user_id_idx" ON "login_challenges"("user_id");

-- CreateIndex
CREATE INDEX "login_challenges_expires_at_idx" ON "login_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_verified_by_admin_id_fkey" FOREIGN KEY ("verified_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_location_opening_periods" ADD CONSTRAINT "business_location_opening_periods_business_location_id_fkey" FOREIGN KEY ("business_location_id") REFERENCES "business_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_claimant_user_id_fkey" FOREIGN KEY ("claimant_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "business_claim_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claim_documents" ADD CONSTRAINT "business_claim_documents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_registration_documents" ADD CONSTRAINT "business_registration_documents_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_registration_documents" ADD CONSTRAINT "business_registration_documents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media_batches" ADD CONSTRAINT "business_media_batches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media_batches" ADD CONSTRAINT "business_media_batches_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "business_media_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_staff_members" ADD CONSTRAINT "business_staff_members_business_location_id_fkey" FOREIGN KEY ("business_location_id") REFERENCES "business_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_staff_members" ADD CONSTRAINT "business_staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_location_services" ADD CONSTRAINT "business_location_services_business_location_id_fkey" FOREIGN KEY ("business_location_id") REFERENCES "business_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_location_services" ADD CONSTRAINT "business_location_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_moderation_actions" ADD CONSTRAINT "review_moderation_actions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_moderation_actions" ADD CONSTRAINT "review_moderation_actions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contact_messages" ADD CONSTRAINT "business_contact_messages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contact_messages" ADD CONSTRAINT "business_contact_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contact_messages" ADD CONSTRAINT "business_contact_messages_read_by_user_id_fkey" FOREIGN KEY ("read_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_records" ADD CONSTRAINT "imported_records_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_login_challenges" ADD CONSTRAINT "admin_login_challenges_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "admin_refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_challenges" ADD CONSTRAINT "login_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
