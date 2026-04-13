-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverEmoji" TEXT,
    "revealDate" TIMESTAMP(3),
    "isSealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "collectionId" TEXT;
ALTER TABLE "Entry" ADD COLUMN "orderIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Collection_vaultId_idx" ON "Collection"("vaultId");

-- CreateIndex
CREATE INDEX "Entry_collectionId_idx" ON "Entry"("collectionId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
