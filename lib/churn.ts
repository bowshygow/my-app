import { differenceInDays, addDays } from 'date-fns';

export interface ChurnCalculation {
  currentPeriodAmount: number;
  refundAmount?: number;
  newMonthlyAmount: number;
  proratedAmount?: number;
  usedDays: number;
  totalDays: number;
  remainingDays: number;
}

export interface ChurnItem {
  zohoItemId: string;
  productName: string;
  qtyToCancel: number;
  currentQty: number;
  rate: number;
  lineAmount: number;
}

/**
 * Calculate churn financial impact
 */
export function calculateChurnImpact(
  churnType: 'end_of_period' | 'prorated',
  effectiveDate: Date,
  uadStartDate: Date,
  uadEndDate: Date,
  churnItems: ChurnItem[]
): ChurnCalculation {
  // Calculate current period amount (total of all UAD line items)
  const currentPeriodAmount = churnItems.reduce(
    (sum, item) => sum + (item.currentQty * item.rate), 
    0
  );

  // Calculate total amount to be cancelled
  const totalCancelledAmount = churnItems.reduce(
    (sum, item) => sum + (item.qtyToCancel * item.rate), 
    0
  );

  // Calculate new monthly amount after churn
  const newMonthlyAmount = currentPeriodAmount - totalCancelledAmount;

  // Calculate prorated amounts for prorated cancellations
  let refundAmount: number | undefined;
  let proratedAmount: number | undefined;
  let usedDays: number;
  let totalDays: number;
  let remainingDays: number;

  if (churnType === 'prorated') {
    // Calculate days
    totalDays = differenceInDays(uadEndDate, uadStartDate) + 1; // +1 to include both start and end dates
    usedDays = differenceInDays(effectiveDate, uadStartDate);
    remainingDays = totalDays - usedDays;

    // Calculate prorated amount (what customer should pay for used portion)
    proratedAmount = totalCancelledAmount * (usedDays / totalDays);
    
    // Refund is the unused portion
    refundAmount = totalCancelledAmount - proratedAmount;
  } else {
    // End of period - no refund, customer pays full amount
    usedDays = 0;
    totalDays = 0;
    remainingDays = 0;
  }

  return {
    currentPeriodAmount,
    refundAmount,
    newMonthlyAmount,
    proratedAmount,
    usedDays,
    totalDays,
    remainingDays
  };
}

/**
 * Validate churn request data
 */
export function validateChurnRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.churnType || !['end_of_period', 'prorated'].includes(data.churnType)) {
    errors.push('Invalid churn type. Must be "end_of_period" or "prorated"');
  }

  if (!data.effectiveDate) {
    errors.push('Effective date is required');
  } else {
    const effectiveDate = new Date(data.effectiveDate);
    if (isNaN(effectiveDate.getTime())) {
      errors.push('Invalid effective date format');
    }
  }

  if (!data.soId) {
    errors.push('Sales Order ID is required');
  }

  if (!data.uadId) {
    errors.push('UAD ID is required');
  }

  if (!data.churnItems || !Array.isArray(data.churnItems) || data.churnItems.length === 0) {
    errors.push('At least one churn item is required');
  } else {
    data.churnItems.forEach((item: any, index: number) => {
      if (!item.zohoItemId) {
        errors.push(`Churn item ${index + 1}: Zoho item ID is required`);
      }
      if (!item.productName) {
        errors.push(`Churn item ${index + 1}: Product name is required`);
      }
      if (!item.qtyToCancel || item.qtyToCancel <= 0) {
        errors.push(`Churn item ${index + 1}: Quantity to cancel must be greater than 0`);
      }
      if (!item.currentQty || item.currentQty <= 0) {
        errors.push(`Churn item ${index + 1}: Current quantity must be greater than 0`);
      }
      if (item.qtyToCancel > item.currentQty) {
        errors.push(`Churn item ${index + 1}: Cannot cancel more than current quantity`);
      }
      if (!item.rate || item.rate <= 0) {
        errors.push(`Churn item ${index + 1}: Rate must be greater than 0`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Get churn status color for UI
 */
export function getChurnStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'Approved':
      return 'text-blue-600 bg-blue-100';
    case 'Processed':
      return 'text-green-600 bg-green-100';
    case 'Cancelled':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get churn type display name
 */
export function getChurnTypeDisplayName(churnType: string): string {
  switch (churnType) {
    case 'end_of_period':
      return 'End of Period Cancellation';
    case 'prorated':
      return 'Prorated Cancellation';
    default:
      return churnType;
  }
}
