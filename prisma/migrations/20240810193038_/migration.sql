/*
  Warnings:

  - A unique constraint covering the columns `[shareLink]` on the table `Folder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "shareExpires" TIMESTAMP(3),
ADD COLUMN     "shareLink" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Folder_shareLink_key" ON "Folder"("shareLink");
