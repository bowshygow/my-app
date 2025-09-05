/**
 * Test: First Cycle Example - May 5, 2024 → June 15, 2024
 * 
 * Expected:
 * Invoice 1 (May 5-31): 27/31 days = ₹3,483.87
 * Invoice 2 (June 1-15): 15/30 days = ₹2,000.00
 * Total: ₹5,483.87
 */

// Test data for First Cycle example
const testData = {
  uad: {
    startDate: "2024-05-05",
    endDate: "2024-06-15",
    lineItems: [
      { productName: "Product A", qtyUad: 1, rate: 2000 },
      { productName: "Product B", qtyUad: 1, rate: 2000 }
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

// Month-by-month proration logic
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

// Test execution
function runTest() {
  console.log(`🧪 TESTING: First Cycle Example`);
  console.log(`================================================================================`);
  
  const uadStart = new Date(testData.uad.startDate);
  const uadEnd = new Date(testData.uad.endDate);
  
  // Calculate total monthly amount
  const totalMonthlyAmount = testData.uad.lineItems.reduce((sum, item) => sum + (item.qtyUad * item.rate), 0);
  
  console.log(`UAD Period: ${formatDate(uadStart)} → ${formatDate(uadEnd)}`);
  console.log(`Total Monthly Value: ₹${totalMonthlyAmount}`);
  
  // Calculate proration
  const totalAmount = calculateMonthlyProration(uadStart, uadEnd, totalMonthlyAmount);
  
  console.log(`\n✅ RESULTS:`);
  console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
  
  // Verification
  console.log(`\n🔍 VERIFICATION:`);
  const mayAmount = 4000 * 27/31;
  const juneAmount = 4000 * 15/30;
  const expectedTotal = mayAmount + juneAmount;
  
  console.log(`May 5-31: 27/31 days = ₹${mayAmount.toFixed(2)}`);
  console.log(`June 1-15: 15/30 days = ₹${juneAmount.toFixed(2)}`);
  console.log(`Expected Total: ₹${expectedTotal.toFixed(2)}`);
  
  const matches = Math.abs(totalAmount - expectedTotal) < 0.01;
  console.log(`\n${matches ? '✅' : '❌'} Calculation ${matches ? 'CORRECT' : 'INCORRECT'}`);
  
  if (matches) {
    console.log(`🎉 First Cycle logic implemented correctly!`);
  } else {
    console.log(`⚠️  Expected: ₹${expectedTotal.toFixed(2)}, Got: ₹${totalAmount.toFixed(2)}`);
  }
}

// Run the test
runTest();
