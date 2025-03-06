/*
  Warnings:

  - Added the required column `title` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "title" TEXT NOT NULL;
