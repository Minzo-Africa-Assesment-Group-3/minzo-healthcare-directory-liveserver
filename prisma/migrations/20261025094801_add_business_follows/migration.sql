-- CreateTable
CREATE TABLE "business_follows" (
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_follows_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateIndex
CREATE INDEX "business_follows_business_id_created_at_idx" ON "business_follows"("business_id", "created_at");

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
