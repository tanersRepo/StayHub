-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "discountAmount" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "subtotalAmount" INTEGER;

-- CreateTable
CREATE TABLE "NightlyRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomTypeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "NightlyRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NightlyRate_roomTypeId_date_key" ON "NightlyRate"("roomTypeId", "date");
