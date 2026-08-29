-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" VARCHAR(512),
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auth sessions must expire after they are created.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_expires_after_creation_check"
CHECK ("expiresAt" > "createdAt");

-- Revocation cannot occur before session creation.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_revoked_after_creation_check"
CHECK ("revokedAt" IS NULL OR "revokedAt" >= "createdAt");

-- Last-use time cannot be earlier than session creation.
ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_last_used_after_creation_check"
CHECK ("lastUsedAt" >= "createdAt");

-- Optimize active-session lookups and expiration checks.
CREATE INDEX "AuthSession_active_user_expires_idx"
ON "AuthSession" ("userId", "expiresAt")
WHERE "revokedAt" IS NULL;