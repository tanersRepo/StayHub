/*
  Warnings:

  - You are about to drop the `PropertyImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PropertyImage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PropertyMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "durationSec" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "minNights" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "checkInTime" TEXT NOT NULL DEFAULT '15:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("address", "amenities", "checkInTime", "checkOutTime", "city", "country", "createdAt", "currency", "description", "hostId", "id", "lat", "lng", "status", "title", "type", "updatedAt") SELECT "address", "amenities", "checkInTime", "checkOutTime", "city", "country", "createdAt", "currency", "description", "hostId", "id", "lat", "lng", "status", "title", "type", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE INDEX "Property_city_idx" ON "Property"("city");
CREATE INDEX "Property_status_idx" ON "Property"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PropertyMedia_propertyId_order_idx" ON "PropertyMedia"("propertyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_propertyId_minNights_key" ON "PricingRule"("propertyId", "minNights");
