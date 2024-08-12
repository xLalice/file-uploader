/*
  Warnings:

  - You are about to drop the column `public_id` on the `File` table. All the data in the column will be lost.
  - Added the required column `url` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "File_public_id_key";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "public_id",
ADD COLUMN     "url" TEXT NOT NULL;
