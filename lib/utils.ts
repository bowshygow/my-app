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
      return new Date(date.getFullYear(), 11, 31); // Dec 31
      
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
 * Calculate prorated amount based on overlap between UAD dates and billing cycle
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

  // Calculate denominator based on billing day rules
  let denominator: number;
  if (billingDay) {
    // For monthly cycles with billing day, denominator = billing day (or actual month length if billing day > month length)
    const monthLength = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 0).getDate();
    denominator = Math.min(billingDay, monthLength);
  } else {
    // Default to total days in cycle
    denominator = differenceInDays(cycleEnd, cycleStart) + 1;
  }

  const activeDays = differenceInDays(overlapEnd, overlapStart) + 1;

  // Check if this is a full cycle overlap
  const isFullCycle = (overlapStart.getTime() === cycleStart.getTime() && overlapEnd.getTime() === cycleEnd.getTime());
  
  if (isFullCycle) {
    return { amount: fullAmount, breakdown: { reason: 'Full cycle' } };
  }

  const fraction = activeDays / denominator;
  const proratedAmount = Math.round(fullAmount * fraction * 100) / 100;

  // Generate month-wise breakdown for detailed logging
  const months: any[] = [];
  let currentDate = new Date(overlapStart);
  
  while (currentDate <= overlapEnd) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Find start and end of current month within the overlap period
    const monthStart = new Date(Math.max(currentDate.getTime(), overlapStart.getTime()));
    const monthEnd = new Date(Math.min(
      new Date(year, month, 0).getTime(), // Last day of current month
      overlapEnd.getTime()
    ));
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const activeDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    
    // Use billing day as denominator for monthly breakdown if specified
    const monthDenominator = billingDay ? Math.min(billingDay, daysInMonth) : daysInMonth;
    const monthFraction = activeDaysInMonth / monthDenominator;
    const monthAmount = Math.round(fullAmount * monthFraction * 100) / 100;
    
    months.push({
      year,
      month,
      activeDays: activeDaysInMonth,
      daysInMonth: monthDenominator,
      fraction: Math.round(monthFraction * 10000) / 10000,
      amount: monthAmount
    });
    
    // Move to next month
    currentDate = new Date(year, month, 1);
  }

  return {
    amount: proratedAmount,
    breakdown: {
      reason: 'Prorated',
      denominator,
      activeDays,
      fraction: Math.round(fraction * 10000) / 10000,
      fullAmount,
      proratedAmount,
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
