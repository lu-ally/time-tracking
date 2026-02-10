/*
  Warnings:

  - You are about to drop the column `targetMinutesPerDay` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "targetMinutesPerDay",
ADD COLUMN     "targetMinutesFri" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "targetMinutesMon" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "targetMinutesSat" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetMinutesSun" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetMinutesThu" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "targetMinutesTue" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN     "targetMinutesWed" INTEGER NOT NULL DEFAULT 480;
