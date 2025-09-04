/**
 * Test Suite: Monthly Billing with Partial UAD Coverage
 * 
 * This test validates the exact scenario we discussed:
 * - Sales Order: Jan 1, 2024 → Dec 31, 2024 (Monthly billing on 15th)
 * - UAD: Mar 10, 2024 → Jun 20, 2024
 * - Products: IT Support (100 hrs @ ₹500) + System Maintenance (50 hrs @ ₹300)
 * - Expected: 5 invoices with prorated amounts
 */

// Note: We'll implement the functions directly since we can't import TypeScript modules in Node.js
// The functions below are copied from the actual application code

// Test data matching our exact scenario
const testScenario = {
  name: "Monthly Billing with Partial UAD Coverage - TechCorp Solutions",
  description: "IT Support and Maintenance for ABC Manufacturing",
  
  salesOrder: {
    id: "so_test_001",
    soNumber: "SO-2024-001",
    customerName: "ABC Manufacturing",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    billingCycle: "monthly",
    billingDay: 15,
    currency: "INR"
  },
  
  uad: {
    id: "uad_test_001",
    startDate: "2024-03-10",
    endDate: "2024-06-20",
    factoryId: "factory_001",
    notes: "IT Support and Maintenance Services",
    lineItems: [
      {
        zohoItemId: "item_001",
        productName: "IT Support",
        qtyUad: 100,
        rate: 500
      },
      {
        zohoItemId: "item_002", 
        productName: "System Maintenance",
        qtyUad: 50,
        rate: 300
      }
    ]
  },
  
  expectedResults: {
    totalInvoices: 5,
    totalAmount: 219761.91,
    invoices: [
      {
        cycleStart: "2024-02-16",
        cycleEnd: "2024-03-15",
        amount: 13928.58,
        prorated: true,
        description: "Mar 10-15: 6 days out of 28"
      },
      {
        cycleStart: "2024-03-16", 
        cycleEnd: "2024-04-15",
        amount: 65000.00,
        prorated: false,
        description: "Full month coverage"
      },
      {
        cycleStart: "2024-04-16",
        cycleEnd: "2024-05-15", 
        amount: 65000.00,
        prorated: false,
        description: "Full month coverage"
      },
      {
        cycleStart: "2024-05-16",
        cycleEnd: "2024-06-15",
        amount: 65000.00,
        prorated: false,
        description: "Full month coverage"
      },
      {
        cycleStart: "2024-06-16",
        cycleEnd: "2024-07-15",
        amount: 10833.33,
        prorated: true,
        description: "Jun 16-20: 5 days out of 30"
      }
    ]
  }
};

// Utility functions (copied from the application)
function parseDate(dateStr) {
  return new Date(dateStr);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function countDays(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function addMonths(date, n) {
  const y = date.getFullYear();
  const m = date.getMonth() + n;
  const d = date.getDate();
  const newDate = new Date(y, m, 1);
  const days = getDaysInMonth(newDate.getFullYear(), newDate.getMonth() + 1);
  newDate.setDate(Math.min(d, days));
  return newDate;
}

// Core calculation functions (copied from app/api/uads/route.ts)
function getNextCycleEnd(start, cycle, billingDay) {
  const y = start.getFullYear();
  const m = start.getMonth() + 1;
  const d = start.getDate();

  if (cycle === "monthly") {
    let cm = m, cy = y;
    if (d > billingDay) {
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }
    const days = getDaysInMonth(cy, cm);
    return new Date(cy, cm - 1, Math.min(billingDay, days));
  }

  if (cycle === "quarterly") {
    const ends = [{m:3,d:31},{m:6,d:30},{m:9,d:30},{m:12,d:31}];
    for (const e of ends) {
      if (e.m > m || (e.m === m && e.d >= d)) return new Date(y, e.m - 1, e.d);
    }
    return new Date(y+1, 2, 31);
  }

  if (cycle === "half-yearly") {
    const ends = [{m:6,d:30},{m:12,d:31}];
    for (const e of ends) {
      if (e.m > m || (e.m === m && e.d >= d)) return new Date(y, e.m - 1, e.d);
    }
    return new Date(y+1, 11, 31);
  }

  if (cycle === "yearly") return addMonths(start, 12);
  throw new Error("Unsupported cycle: "+cycle);
}

function prorateByMonth(overlapStart, overlapEnd, qty, rate, productId) {
  const breakdown = [];
  let total = 0;
  let current = new Date(overlapStart);

  while (current <= overlapEnd) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const daysInMonth = getDaysInMonth(y, m);
    const monthStart = new Date(y, m-1, 1);
    const monthEnd = new Date(y, m-1, daysInMonth);

    const activeStart = current > monthStart ? current : monthStart;
    const activeEnd = overlapEnd < monthEnd ? overlapEnd : monthEnd;
    const activeDays = countDays(activeStart, activeEnd);
    const frac = activeDays / daysInMonth;

    const fullMonthAmount = qty * rate;
    const part = fullMonthAmount * frac;
    total += part;

    breakdown.push({
      productId,
      year: y,
      month: m,
      activeDays,
      daysInMonth,
      fraction: +frac.toFixed(4),
      amount: +part.toFixed(2)
    });

    current = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate()+1);
  }
  return { total, breakdown };
}

// Main invoice generation function (copied from app/api/uads/route.ts)
function generateInvoicesForUAD(salesOrder, uad) {
  const invoices = [];
  
  const soStart = new Date(salesOrder.startDate);
  const soEnd = new Date(salesOrder.endDate);
  const uadStart = new Date(uad.startDate);
  const uadEnd = new Date(uad.endDate);

  console.log(`\n🔄 CYCLE GENERATION LOGIC:`);
  console.log(`   SO Start: ${soStart.toISOString().split('T')[0]}`);
  console.log(`   SO End: ${soEnd.toISOString().split('T')[0]}`);
  console.log(`   UAD Start: ${uadStart.toISOString().split('T')[0]}`);
  console.log(`   UAD End: ${uadEnd.toISOString().split('T')[0]}`);

  if (uadStart < soStart || uadEnd > soEnd) {
    throw new Error("UAD outside SO window");
  }

  let cycleEnd = getNextCycleEnd(uadStart, salesOrder.billingCycle, salesOrder.billingDay);
  let cycleIndex = 0;

  console.log(`   First cycle end calculated: ${cycleEnd.toISOString().split('T')[0]}`);

  while (cycleEnd <= soEnd) {
    const cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleEnd.getMonth() - 1);
    cycleStart.setDate(cycleStart.getDate() + 1);
    cycleIndex++;

    console.log(`\n--- Cycle #${cycleIndex} (${cycleStart.toDateString()} → ${cycleEnd.toDateString()}) ---`);

    const overlapStart = uadStart > cycleStart ? uadStart : cycleStart;
    const overlapEnd = uadEnd < cycleEnd ? uadEnd : cycleEnd;

    if (overlapStart > overlapEnd) {
      console.log(`No overlap. Skipping cycle.`);
      if (cycleStart > uadEnd) break;
      cycleEnd = getNextCycleEnd(new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate()+1), salesOrder.billingCycle, salesOrder.billingDay);
      continue;
    }

    console.log(`Overlap: ${overlapStart.toDateString()} → ${overlapEnd.toDateString()}`);

    let totalAmount = 0, breakdown = [], prorated = false;

    for (const item of uad.lineItems) {
      const rate = item.rate;
      const fullMonthAmount = item.qtyUad * rate;

      if (overlapStart.getTime() === cycleStart.getTime() && overlapEnd.getTime() === cycleEnd.getTime()) {
        console.log(`Product ${item.zohoItemId}: FULL cycle → Qty=${item.qtyUad}, Rate=${rate}, Amount=${fullMonthAmount}`);
        totalAmount += fullMonthAmount;
      } else {
        console.log(`Product ${item.zohoItemId}: PARTIAL cycle → Qty=${item.qtyUad}, Rate=${rate}`);
        prorated = true;
        const { total, breakdown: bd } = prorateByMonth(overlapStart, overlapEnd, item.qtyUad, rate, item.zohoItemId);
        totalAmount += total;
        bd.forEach(b => {
          console.log(`   • ${b.year}-${b.month}: ${b.activeDays}/${b.daysInMonth} days = fraction ${b.fraction}, Amount=${b.amount}`);
        });
        breakdown = breakdown.concat(bd);
      }
    }

    const finalAmount = +totalAmount.toFixed(2);
    console.log(`Cycle Total = ₹${finalAmount} ${prorated ? "(Prorated)" : "(Full)"}`);

    if (finalAmount > 0) {
      invoices.push({
        cycleStart: formatDate(cycleStart),
        cycleEnd: formatDate(cycleEnd),
        invoiceDate: formatDate(cycleEnd),
        amount: finalAmount,
        prorated: prorated,
        breakdown: breakdown
      });
    }

    if (cycleStart > uadEnd) break;
    cycleEnd = getNextCycleEnd(new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), cycleEnd.getDate()+1), salesOrder.billingCycle, salesOrder.billingDay);
  }
  
  return invoices;
}

// Test execution function
function runTest() {
  console.log("🧪 TESTING: Monthly Billing with Partial UAD Coverage");
  console.log("================================================================================\n");
  
  console.log(`📋 TEST SCENARIO: ${testScenario.name}`);
  console.log(`📝 ${testScenario.description}`);
  console.log("================================================================================\n");
  
  console.log(`📋 SALES ORDER DETAILS:`);
  console.log(`   SO Number: ${testScenario.salesOrder.soNumber}`);
  console.log(`   Customer: ${testScenario.salesOrder.customerName}`);
  console.log(`   Period: ${testScenario.salesOrder.startDate} → ${testScenario.salesOrder.endDate}`);
  console.log(`   Billing: ${testScenario.salesOrder.billingCycle} on ${testScenario.salesOrder.billingDay}th`);
  console.log("================================================================================\n");
  
  console.log(`📄 UAD DETAILS:`);
  console.log(`   UAD ID: ${testScenario.uad.id}`);
  console.log(`   Period: ${testScenario.uad.startDate} → ${testScenario.uad.endDate}`);
  console.log(`   Factory: ${testScenario.uad.factoryId}`);
  console.log(`   Notes: ${testScenario.uad.notes}`);
  console.log("================================================================================\n");
  
  console.log(`🛍️ PRODUCT LINE ITEMS:`);
  testScenario.uad.lineItems.forEach((item, index) => {
    console.log(`   Item ${index + 1}:`);
    console.log(`     Product: ${item.productName}`);
    console.log(`     Zoho Item ID: ${item.zohoItemId}`);
    console.log(`     UAD Quantity: ${item.qtyUad}`);
    console.log(`     Rate per Unit: ₹${item.rate}`);
    console.log(`     Total Value: ₹${(item.qtyUad * item.rate).toFixed(2)}`);
  });
  
  const totalUADValue = testScenario.uad.lineItems.reduce((sum, item) => sum + (item.qtyUad * item.rate), 0);
  console.log(`================================================================================`);
  console.log(`💰 TOTAL UAD VALUE: ₹${totalUADValue.toFixed(2)}`);
  console.log(`================================================================================\n`);

  try {
    // Generate invoices using the actual application logic
    const actualInvoices = generateInvoicesForUAD(testScenario.salesOrder, testScenario.uad);
    const actualTotal = actualInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    
    console.log(`\n=== INVOICE GENERATION RESULTS ===`);
    console.log(`✅ Generated ${actualInvoices.length} invoices`);
    console.log(`💰 Total Amount: ₹${actualTotal.toLocaleString()}`);
    console.log(`🎯 Expected Total: ₹${testScenario.expectedResults.totalAmount.toLocaleString()}`);
    console.log(`================================================================================\n`);
    
    // Validate results
    let passedTests = 0;
    let totalTests = 0;
    
    // Check total amount
    const totalMatch = Math.abs(actualTotal - testScenario.expectedResults.totalAmount) < 0.01;
    if (totalMatch) {
      console.log("✅ Total amount matches expected");
      passedTests++;
    } else {
      console.log(`❌ Total amount mismatch: Expected ₹${testScenario.expectedResults.totalAmount}, Got ₹${actualTotal}`);
    }
    totalTests++;
    
    // Check number of invoices
    const invoiceCountMatch = actualInvoices.length === testScenario.expectedResults.totalInvoices;
    if (invoiceCountMatch) {
      console.log("✅ Number of invoices matches expected");
      passedTests++;
    } else {
      console.log(`❌ Invoice count mismatch: Expected ${testScenario.expectedResults.totalInvoices}, Got ${actualInvoices.length}`);
    }
    totalTests++;
    
    // Check individual invoices
    testScenario.expectedResults.invoices.forEach((expectedInvoice, index) => {
      const actualInvoice = actualInvoices[index];
      if (actualInvoice) {
        const amountMatch = Math.abs(actualInvoice.amount - expectedInvoice.expectedAmount) < 0.01;
        const proratedMatch = actualInvoice.prorated === expectedInvoice.prorated;
        
        console.log(`\n📄 Invoice ${index + 1}:`);
        console.log(`   Period: ${actualInvoice.cycleStart} → ${actualInvoice.cycleEnd}`);
        console.log(`   Amount: ₹${actualInvoice.amount} (Expected: ₹${expectedInvoice.expectedAmount}) ${amountMatch ? '✅' : '❌'}`);
        console.log(`   Prorated: ${actualInvoice.prorated} (Expected: ${expectedInvoice.prorated}) ${proratedMatch ? '✅' : '❌'}`);
        console.log(`   ${expectedInvoice.description}`);
        
        if (amountMatch && proratedMatch) {
          passedTests++;
        }
      } else {
        console.log(`\n📄 Invoice ${index + 1}: ❌ Missing expected invoice`);
      }
      totalTests++;
    });
    
    // Show detailed breakdown for prorated invoices
    actualInvoices.forEach((invoice, index) => {
      if (invoice.prorated && invoice.breakdown.length > 0) {
        console.log(`\n📊 Breakdown for Invoice ${index + 1}:`);
        invoice.breakdown.forEach(detail => {
          console.log(`   ${detail.productId} - ${detail.month}/${detail.year}: ${detail.activeDays}/${detail.daysInMonth} days (${(detail.fraction * 100).toFixed(2)}%) = ₹${detail.amount.toFixed(2)}`);
        });
      }
    });
    
    console.log("\n================================================================================\n");
    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log("🎉 All tests passed! Invoice calculations are working correctly.");
    } else {
      console.log("⚠️  Some tests failed. Please review the calculation logic.");
    }
    
    return {
      passed: passedTests === totalTests,
      passedTests,
      totalTests,
      actualInvoices,
      actualTotal
    };
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    console.error(error);
    return {
      passed: false,
      error: error.message
    };
  }
}

// Run the test
console.log("Starting test execution...");
runTest();
