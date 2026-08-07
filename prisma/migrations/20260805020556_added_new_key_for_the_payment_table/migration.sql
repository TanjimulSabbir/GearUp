/*
  Warnings:

  - A unique constraint covering the columns `[stripeSessionId]` on the table `Payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `days` to the `Rental_Items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerDay` to the `Rental_Items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "RentalStatus" ADD VALUE 'PAYMENT_FAILED';

-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- AlterTable
ALTER TABLE "Rental_Items" ADD COLUMN     "days" INTEGER NOT NULL,
ADD COLUMN     "pricePerDay" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payments_stripeSessionId_key" ON "Payments"("stripeSessionId");
