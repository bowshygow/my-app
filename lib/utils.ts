import { format, addMonths, endOfMonth, startOfMonth, differenceInDays, isWithinInterval } from 'date-fns';

export type BillingCycle = 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';

export interface CycleDates {
  start: Date;
  end: Date;
  isFullCycle?: boolean;
}

/**
 * Calculate billing cycle dates based on SO start date and billing cycle
 */
/**
 * Find the first cycle end on or after a given date
 */
export function firstCycleEndOnOrAfter(
  date: Date,
  billingCycle: BillingCycle,
  billingDay?: number
): Date {
  const normalizedCycle = billingCycle.toLowerCase().replace('-', '').trim();
  
  switch (normalizedCycle) {
    case 'monthly':
      if (billingDay) {
        const monthLength = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const endDay = Math.min(billingDay, monthLength);
        const cycleEnd = new Date(date.getFullYear(), date.getMonth(), endDay);
        
        // If date is already past the billing day, move to next month
        if (date > cycleEnd) {
          const nextMonth = addMonths(date, 1);
          const nextMonthLength = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
          const nextEndDay = Math.min(billingDay, nextMonthLength);
          return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextEndDay);
        }
        return cycleEnd;
      } else {
        return endOfMonth(date);
      }
      
    case 'quarterly':
      const month = date.getMonth();
      const year = date.getFullYear();
      
      if (month <= 2) return new Date(year, 2, 31); // Mar 31
      if (month <= 5) return new Date(year, 5, 30); // Jun 30
      if (month <= 8) return new Date(year, 8, 30); // Sep 30
      return new Date(year, 11, 31); // Dec 31
      
    case 'halfyearly':
      const halfMonth = date.getMonth();
      const halfYear = date.getFullYear();
      
      if (halfMonth <= 5) return new Date(halfYear, 5, 30); // Jun 30
      return new Date(halfYear, 11, 31); // Dec 31
      
    case 'yearly':
      // For yearly billing, align with UAD start date (same month/day next year)
      const nextYear = date.getFullYear() + 1;
      const yearlyMonth: number = date.getMonth();
      const yearlyDay: number = date.getDate();
      return new Date(nextYear, yearlyMonth, yearlyDay);
      
    default:
      throw new Error(`Unsupported billing cycle: ${billingCycle}`);
  }
}

/**
 * Find the next cycle end after a given cycle end
 */
export function nextCycleEnd(
  currentCycleEnd: Date,
  billingCycle: BillingCycle,
  billingDay?: number
): Date {
  const normalizedCycle = billingCycle.toLowerCase().replace('-', '').trim();
  
  switch (normalizedCycle) {
    case 'monthly':
      if (billingDay) {
        const nextMonth = addMonths(currentCycleEnd, 1);
        const monthLength = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        const endDay = Math.min(billingDay, monthLength);
        return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), endDay);
      } else {
        return addMonths(currentCycleEnd, 1);
      }
      
    case 'quarterly':
      return addMonths(currentCycleEnd, 3);
      
    case 'halfyearly':
      return addMonths(currentCycleEnd, 6);
      
    case 'yearly':
      return addMonths(currentCycleEnd, 12);
      
    default:
      throw new Error(`Unsupported billing cycle: ${billingCycle}`);
  }
}

/**
 * Calculate cycle dates for a given cycle number (legacy function for compatibility)
 */
export function calculateCycleDates(
  soStartDate: Date,
  cycleNumber: number,
  billingCycle: BillingCycle,
  billingDay?: number
): CycleDates {
  if (cycleNumber === 0) {
    const cycleEnd = firstCycleEndOnOrAfter(soStartDate, billingCycle, billingDay);
    return {
      start: new Date(soStartDate),
      end: cycleEnd
    };
  } else {
    const prevCycle = calculateCycleDates(soStartDate, cycleNumber - 1, billingCycle, billingDay);
    const cycleStart = new Date(prevCycle.end);
    cycleStart.setDate(cycleStart.getDate() + 1);
    const cycleEnd = nextCycleEnd(prevCycle.end, billingCycle, billingDay);
    return {
      start: cycleStart,
      end: cycleEnd
    };
  }
}


/**
 * Calculate prorated amount based on month-by-month proration
 * Price is per month, so we prorate by actual calendar months
 */
export function calculateProratedAmount(
  uadStartDate: Date,
  uadEndDate: Date,
  cycleStart: Date,
  cycleEnd: Date,
  fullAmount: number,
  billingDay?: number
): { amount: number; breakdown: any } {
  // Find overlap between UAD dates and billing cycle
  const overlapStart = new Date(Math.max(uadStartDate.getTime(), cycleStart.getTime()));
  const overlapEnd = new Date(Math.min(uadEndDate.getTime(), cycleEnd.getTime()));

  if (overlapStart > overlapEnd) {
    return { amount: 0, breakdown: { reason: 'No overlap' } };
  }

  // Check if this is a full cycle overlap
  const isFullCycle = (overlapStart.getTime() === cycleStart.getTime() && overlapEnd.getTime() === cycleEnd.getTime());
  
  if (isFullCycle) {
    return { amount: fullAmount, breakdown: { reason: 'Full cycle' } };
  }

  // CORRECTED: Month-by-month proration logic
  let totalAmount = 0;
  const months: any[] = [];
  let currentDate = new Date(overlapStart);
  
  while (currentDate <= overlapEnd) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Find overlap with current month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);
    
    const monthOverlapStart = new Date(Math.max(overlapStart.getTime(), monthStart.getTime()));
    const monthOverlapEnd = new Date(Math.min(overlapEnd.getTime(), monthEnd.getTime()));
    
    const activeDaysInMonth = differenceInDays(monthOverlapEnd, monthOverlapStart) + 1;
    const monthFraction = activeDaysInMonth / daysInMonth;
    const monthAmount = Math.round(fullAmount * monthFraction * 100) / 100;
    
    months.push({
      year,
      month,
      activeDays: activeDaysInMonth,
      daysInMonth: daysInMonth,
      fraction: Math.round(monthFraction * 10000) / 10000,
      amount: monthAmount
    });
    
    totalAmount += monthAmount;
    
    // Move to next month
    currentDate = new Date(year, month, 1);
  }

  return {
    amount: totalAmount,
    breakdown: {
      reason: 'Prorated',
      fullAmount,
      proratedAmount: totalAmount,
      months
    }
  };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return format(date, 'dd MMM yyyy');
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date): string {
  return format(date, 'dd MMM yyyy HH:mm');
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hash password using bcrypt
 */
export function hashPassword(password: string): string {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(password, 10);
}

/**
 * Compare password using bcrypt
 */
export function comparePassword(password: string, hashedPassword: string): boolean {
  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(password, hashedPassword);
}
