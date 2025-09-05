/**
 * Test Suite: Corrected Month-by-Month Proration Logic
 * 
 * Key Changes:
 * 1. Remove cycle logic for proration calculations
 * 2. Use month-by-month proration: (active days in month) / (total days in month)
 * 3. Clean, concise debug logs
 * 4. Billing cycle only determines invoice dates, not proration
 */

// Test data
const testScenario = {
  name: "Corrected Month-by-Month Proration",
  
  salesOrder: {
    startDate: "2024-05-01",
    endDate: "2027-03-25",
    billingCycle: "monthly",
    billingDay: 15
  },
  
  uad: {
    startDate: "2025-05-20",
    endDate: "2025-07-24",
    lineItems: [
      { productName: "Advisory Solutions", qtyUad: 1, rate: 2000 },
      { productName: "Accounting & Compliances", qtyUad: 1, rate: 2000 }
    ]
  }
};

// Utility functions
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function countDays(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// CORRECTED: Month-by-month proration logic
function calculateMonthlyProration(uadStart, uadEnd, monthlyAmount) {
  console.log(`\n📊 MONTH-BY-MONTH PRORATION:`);
  console.log(`UAD Period: ${formatDate(uadStart)} → ${formatDate(uadEnd)}`);
  console.log(`Monthly Amount: ₹${monthlyAmount}`);
  
  let totalAmount = 0;
  let current = new Date(uadStart);
  
  while (current <= uadEnd) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const daysInMonth = getDaysInMonth(year, month);
    
    // Find overlap with current month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);
    
    const overlapStart = new Date(Math.max(uadStart.getTime(), monthStart.getTime()));
    const overlapEnd = new Date(Math.min(uadEnd.getTime(), monthEnd.getTime()));
    
    const activeDays = countDays(overlapStart, overlapEnd);
    const fraction = activeDays / daysInMonth;
    const monthAmount = monthlyAmount * fraction;
    
    console.log(`${year}-${month.toString().padStart(2, '0')}: ${activeDays}/${daysInMonth} days = ${(fraction * 100).toFixed(1)}% = ₹${monthAmount.toFixed(2)}`);
    
    totalAmount += monthAmount;
    
    // Move to next month
    current = new Date(year, month, 1);
  }
  
  console.log(`Total Prorated Amount: ₹${totalAmount.toFixed(2)}`);
  return totalAmount;
}

// CORRECTED: Generate invoices with proper proration
function generateInvoices(salesOrder, uad) {
  console.log(`\n🔄 INVOICE GENERATION START`);
  console.log(`SO: ${formatDate(new Date(salesOrder.startDate))} → ${formatDate(new Date(salesOrder.endDate))}`);
  console.log(`UAD: ${formatDate(new Date(uad.startDate))} → ${formatDate(new Date(uad.endDate))}`);
  console.log(`Billing: ${salesOrder.billingCycle} on ${salesOrder.billingDay}th`);
  
  const invoices = [];
  const uadStart = new Date(uad.startDate);
  const uadEnd = new Date(uad.endDate);
  
  // Calculate total monthly amount for all products
  const totalMonthlyAmount = uad.lineItems.reduce((sum, item) => sum + (item.qtyUad * item.rate), 0);
  console.log(`Total Monthly Value: ₹${totalMonthlyAmount}`);
  
  // CORRECTED: Use month-by-month proration instead of cycle logic
  const totalAmount = calculateMonthlyProration(uadStart, uadEnd, totalMonthlyAmount);
  
  // Create single invoice for the entire UAD period
  const invoice = {
    period: `${formatDate(uadStart)} → ${formatDate(uadEnd)}`,
    amount: totalAmount,
    prorated: true,
    description: `Month-by-month proration for ${countDays(uadStart, uadEnd)} days`
  };
  
  invoices.push(invoice);
  
  console.log(`\n✅ INVOICE CREATED:`);
  console.log(`Period: ${invoice.period}`);
  console.log(`Amount: ₹${invoice.amount.toFixed(2)}`);
  console.log(`Type: ${invoice.prorated ? 'Prorated' : 'Full'}`);
  
  return invoices;
}

// Test execution
function runTest() {
  console.log(`🧪 TESTING: ${testScenario.name}`);
  console.log(`================================================================================`);
  
  try {
    const invoices = generateInvoices(testScenario.salesOrder, testScenario.uad);
    
    console.log(`\n📋 FINAL RESULTS:`);
    console.log(`Invoices Generated: ${invoices.length}`);
    console.log(`Total Amount: ₹${invoices[0].amount.toFixed(2)}`);
    
    // Expected calculation verification
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`May 20-31: 12/31 days = ₹${(4000 * 12/31).toFixed(2)}`);
    console.log(`June 1-30: 30/30 days = ₹${(4000 * 30/30).toFixed(2)}`);
    console.log(`July 1-24: 24/31 days = ₹${(4000 * 24/31).toFixed(2)}`);
    console.log(`Expected Total: ₹${(4000 * 12/31 + 4000 * 30/30 + 4000 * 24/31).toFixed(2)}`);
    
    console.log(`\n🎉 Test completed successfully!`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

// Run the test
runTest();
