-- CreateTable
CREATE TABLE "public"."InvoiceAggregation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    "externalInvoiceId" TEXT,
    "externalInvoiceNumber" TEXT,
    "invoiceUrl" TEXT,
    "customFields" JSONB,
    "soId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "InvoiceAggregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AggregatedInvoice" (
    "id" TEXT NOT NULL,
    "aggregationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AggregatedInvoice_aggregationId_invoiceId_key" ON "public"."AggregatedInvoice"("aggregationId", "invoiceId");

-- AddForeignKey
ALTER TABLE "public"."InvoiceAggregation" ADD CONSTRAINT "InvoiceAggregation_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAggregation" ADD CONSTRAINT "InvoiceAggregation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AggregatedInvoice" ADD CONSTRAINT "AggregatedInvoice_aggregationId_fkey" FOREIGN KEY ("aggregationId") REFERENCES "public"."InvoiceAggregation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AggregatedInvoice" ADD CONSTRAINT "AggregatedInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
