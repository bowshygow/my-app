// Debug date calculation
function countDays(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// Test May 5-31
const may5 = new Date("2024-05-05");
const may31 = new Date("2024-05-31");

console.log("May 5:", may5.toISOString());
console.log("May 31:", may31.toISOString());
console.log("Days between May 5-31:", countDays(may5, may31));

// Test June 1-15
const june1 = new Date("2024-06-01");
const june15 = new Date("2024-06-15");

console.log("June 1:", june1.toISOString());
console.log("June 15:", june15.toISOString());
console.log("Days between June 1-15:", countDays(june1, june15));

// Manual calculation
console.log("Manual: May 5-31 = 31-5+1 =", 31-5+1);
console.log("Manual: June 1-15 = 15-1+1 =", 15-1+1);
