-- AlterTable
ALTER TABLE "Rental_Orders" ADD COLUMN     "returnRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnRequestedAt" TIMESTAMP(3);
