-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PropertyMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "durationSec" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyMedia_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PropertyMedia" ("createdAt", "durationSec", "id", "kind", "mimeType", "order", "propertyId", "sizeBytes", "url") SELECT "createdAt", "durationSec", "id", "kind", "mimeType", "order", "propertyId", "sizeBytes", "url" FROM "PropertyMedia";
DROP TABLE "PropertyMedia";
ALTER TABLE "new_PropertyMedia" RENAME TO "PropertyMedia";
CREATE INDEX "PropertyMedia_propertyId_order_idx" ON "PropertyMedia"("propertyId", "order");
CREATE INDEX "PropertyMedia_roomTypeId_order_idx" ON "PropertyMedia"("roomTypeId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
