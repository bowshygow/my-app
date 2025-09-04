import { format, addMonths, endOfMonth, startOfMonth, differenceInDays, isWithinInterval } from 'date-fns';

export type BillingCycle = 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';

export interface CycleDates {
  start: Date;
  end: Date;
  isFullCycle: boolean;
}

/**
 * Calculate billing cycle dates based on SO start date and billing cycle
 */
export function calculateCycleDates(
  soStartDate: Date,
  cycleNumber: number,
  billingCycle: BillingCycle,
  billingDay?: number
): CycleDates {
  let cycleStart: Date;
  let cycleEnd: Date;

  // Normalize billing cycle to handle Zoho API variations
  const normalizedCycle = billingCycle.toLowerCase().replace('-', '').trim();
  
  // Log for debugging
  console.log(`Billing cycle normalization: "${billingCycle}" -> "${normalizedCycle}"`);

  switch (normalizedCycle) {
    case 'monthly':
      cycleStart = addMonths(soStartDate, cycleNumber);
      if (billingDay) {
        cycleStart = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), billingDay);
      } else {
        cycleStart = startOfMonth(cycleStart);
      }
      cycleEnd = endOfMonth(cycleStart);
      break;

    case 'quarterly':
      const quarterStart = Math.floor(cycleNumber / 3);
      const monthInQuarter = (cycleNumber % 3) * 3;
      cycleStart = addMonths(soStartDate, quarterStart * 3 + monthInQuarter);
      cycleStart = startOfMonth(cycleStart);
      
      if (monthInQuarter === 0) {
        // Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
        cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 2, 31);
      } else if (monthInQuarter === 3) {
        cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 2, 30);
      } else {
        cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 2, 30);
      }
      break;

    case 'halfyearly':
      const halfYearStart = Math.floor(cycleNumber / 6);
      const monthInHalfYear = (cycleNumber % 6) * 6;
      cycleStart = addMonths(soStartDate, halfYearStart * 6 + monthInHalfYear);
      cycleStart = startOfMonth(cycleStart);
      
      if (monthInHalfYear === 0) {
        // H1: Jan-Jun
        cycleEnd = new Date(cycleStart.getFullYear(), 5, 30);
      } else {
        // H2: Jul-Dec
        cycleEnd = new Date(cycleStart.getFullYear(), 11, 31);
      }
      break;

    case 'yearly':
      cycleStart = addMonths(soStartDate, cycleNumber * 12);
      cycleStart = startOfMonth(cycleStart);
      cycleEnd = new Date(cycleStart.getFullYear(), 11, 31);
      break;

    default:
      console.error(`Unsupported billing cycle: "${billingCycle}" (normalized: "${normalizedCycle}")`);
      console.error(`Billing cycle length: ${billingCycle.length}, Normalized length: ${normalizedCycle.length}`);
      console.error(`Billing cycle char codes:`, Array.from(billingCycle).map(c => `${c}:${c.charCodeAt(0)}`));
      throw new Error(`Unsupported billing cycle: "${billingCycle}". Supported values: monthly, quarterly, halfyearly, yearly`);
  }

  return {
    start: cycleStart,
    end: cycleEnd,
    isFullCycle: true
  };
}

/**
 * Calculate prorated amount based on overlap between UAD dates and billing cycle
 */
export function calculateProratedAmount(
  uadStartDate: Date,
  uadEndDate: Date,
  cycleStart: Date,
  cycleEnd: Date,
  fullAmount: number
): { amount: number; breakdown: any } {
  // Find overlap between UAD dates and billing cycle
  const overlapStart = new Date(Math.max(uadStartDate.getTime(), cycleStart.getTime()));
  const overlapEnd = new Date(Math.min(uadEndDate.getTime(), cycleEnd.getTime()));

  if (overlapStart > overlapEnd) {
    return { amount: 0, breakdown: { reason: 'No overlap' } };
  }

  const totalDaysInCycle = differenceInDays(cycleEnd, cycleStart) + 1;
  const activeDays = differenceInDays(overlapEnd, overlapStart) + 1;

  if (activeDays === totalDaysInCycle) {
    return { amount: fullAmount, breakdown: { reason: 'Full cycle' } };
  }

  const fraction = activeDays / totalDaysInCycle;
  const proratedAmount = Math.round(fullAmount * fraction * 100) / 100;

  return {
    amount: proratedAmount,
    breakdown: {
      reason: 'Prorated',
      totalDaysInCycle,
      activeDays,
      fraction: Math.round(fraction * 10000) / 10000,
      fullAmount,
      proratedAmount
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
