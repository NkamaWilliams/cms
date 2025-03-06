/*
  Warnings:

  - You are about to drop the column `submittedBy` on the `Response` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Response" DROP COLUMN "submittedBy",
ADD COLUMN     "lecturerId" TEXT,
ADD COLUMN     "studentId" TEXT;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
