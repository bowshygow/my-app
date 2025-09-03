-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesOrder" (
    "id" TEXT NOT NULL,
    "soNumber" TEXT NOT NULL,
    "zohoSoId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "billingDay" INTEGER,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SOProduct" (
    "id" TEXT NOT NULL,
    "zohoItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qtySo" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "soId" TEXT NOT NULL,

    CONSTRAINT "SOProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Factory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FactoryAllocation" (
    "id" TEXT NOT NULL,
    "zohoItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qtyFactory" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "factoryId" TEXT NOT NULL,

    CONSTRAINT "FactoryAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UAD" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "soId" TEXT NOT NULL,
    "factoryId" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "UAD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UADLineItem" (
    "id" TEXT NOT NULL,
    "zohoItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qtyUad" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "uadId" TEXT NOT NULL,

    CONSTRAINT "UADLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "externalInvoiceId" TEXT,
    "externalInvoiceNumber" TEXT,
    "invoiceUrl" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "prorated" BOOLEAN NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB,
    "customFields" JSONB,
    "soId" TEXT NOT NULL,
    "factoryId" TEXT,
    "uadId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "zohoItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "lineAmount" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNumber_key" ON "public"."SalesOrder"("soNumber");

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SOProduct" ADD CONSTRAINT "SOProduct_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factory" ADD CONSTRAINT "Factory_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factory" ADD CONSTRAINT "Factory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FactoryAllocation" ADD CONSTRAINT "FactoryAllocation_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "public"."Factory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UAD" ADD CONSTRAINT "UAD_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UAD" ADD CONSTRAINT "UAD_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "public"."Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UAD" ADD CONSTRAINT "UAD_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UADLineItem" ADD CONSTRAINT "UADLineItem_uadId_fkey" FOREIGN KEY ("uadId") REFERENCES "public"."UAD"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_soId_fkey" FOREIGN KEY ("soId") REFERENCES "public"."SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "public"."Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_uadId_fkey" FOREIGN KEY ("uadId") REFERENCES "public"."UAD"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
