/*
  Warnings:

  - A unique constraint covering the columns `[userId,gearItemId,rentalOrderId]` on the table `Reviwes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rentalOrderId` to the `Reviwes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reviwes" ADD COLUMN     "rentalOrderId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reviwes_userId_gearItemId_rentalOrderId_key" ON "Reviwes"("userId", "gearItemId", "rentalOrderId");

-- AddForeignKey
ALTER TABLE "Reviwes" ADD CONSTRAINT "Reviwes_rentalOrderId_fkey" FOREIGN KEY ("rentalOrderId") REFERENCES "Rental_Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
