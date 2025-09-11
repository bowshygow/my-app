-- CreateTable
CREATE TABLE "public"."ChurnRequest" (
    "id" TEXT NOT NULL,
    "churnType" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "totalRefund" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "currentPeriodAmount" DOUBLE PRECISION NOT NULL,
    "refundAmount" DOUBLE PRECISION,
    "newMonthlyAmount" DOUBLE PRECISION NOT NULL,
    "soId" TEXT NOT NULL,
    "uadId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ChurnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChurnItem" (
    "id" TEXT NOT NULL,
    "zohoItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qtyToCancel" INTEGER NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "churnRequestId" TEXT NOT NULL,

    CONSTRAINT "ChurnItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ChurnRequest" ADD CONSTRAINT "ChurnRequest_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChurnRequest" ADD CONSTRAINT "ChurnRequest_uadId_fkey" FOREIGN KEY ("uadId") REFERENCES "public"."UAD"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChurnRequest" ADD CONSTRAINT "ChurnRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChurnItem" ADD CONSTRAINT "ChurnItem_churnRequestId_fkey" FOREIGN KEY ("churnRequestId") REFERENCES "public"."ChurnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
