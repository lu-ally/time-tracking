-- CreateTable
CREATE TABLE "WorkingTimeSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "targetMinutesMon" INTEGER NOT NULL,
    "targetMinutesTue" INTEGER NOT NULL,
    "targetMinutesWed" INTEGER NOT NULL,
    "targetMinutesThu" INTEGER NOT NULL,
    "targetMinutesFri" INTEGER NOT NULL,
    "targetMinutesSat" INTEGER NOT NULL,
    "targetMinutesSun" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingTimeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkingTimeSchedule_userId_effectiveFrom_idx" ON "WorkingTimeSchedule"("userId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingTimeSchedule_userId_effectiveFrom_key" ON "WorkingTimeSchedule"("userId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "WorkingTimeSchedule" ADD CONSTRAINT "WorkingTimeSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one schedule per existing user, effective from the dawn of time, carrying over
-- the previous scalar targetMinutes* values so historical balance calculations are unchanged.
INSERT INTO "WorkingTimeSchedule" (
    "id", "userId", "effectiveFrom",
    "targetMinutesMon", "targetMinutesTue", "targetMinutesWed", "targetMinutesThu",
    "targetMinutesFri", "targetMinutesSat", "targetMinutesSun",
    "createdAt", "updatedAt"
)
SELECT
    substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 25),
    "id",
    '1970-01-01',
    "targetMinutesMon", "targetMinutesTue", "targetMinutesWed", "targetMinutesThu",
    "targetMinutesFri", "targetMinutesSat", "targetMinutesSun",
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

-- AlterTable
ALTER TABLE "User"
    DROP COLUMN "targetMinutesMon",
    DROP COLUMN "targetMinutesTue",
    DROP COLUMN "targetMinutesWed",
    DROP COLUMN "targetMinutesThu",
    DROP COLUMN "targetMinutesFri",
    DROP COLUMN "targetMinutesSat",
    DROP COLUMN "targetMinutesSun";
