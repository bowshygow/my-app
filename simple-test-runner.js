// Simple test runner to debug the issue
console.log("Test runner started...");

// Test the basic functionality
const testData = {
  salesOrder: {
    startDate: "2024-01-01",
    endDate: "2024-12-31", 
    billingCycle: "monthly",
    billingDay: 15
  },
  uad: {
    startDate: "2024-03-10",
    endDate: "2024-06-20",
    lineItems: [
      {
        zohoItemId: "item_001",
        productName: "IT Support",
        qtyUad: 100,
        rate: 500
      }
    ]
  }
};

console.log("Test data created:", JSON.stringify(testData, null, 2));

// Test date parsing
const soStart = new Date(testData.salesOrder.startDate);
const uadStart = new Date(testData.uad.startDate);

console.log("SO Start:", soStart);
console.log("UAD Start:", uadStart);

console.log("Test completed successfully!");
