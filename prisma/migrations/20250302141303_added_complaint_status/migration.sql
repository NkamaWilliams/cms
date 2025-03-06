/*
  Warnings:

  - Changed the type of `status` on the `Complaint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'RESOLVED');

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "status",
ADD COLUMN     "status" "ComplaintStatus" NOT NULL;
