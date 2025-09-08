/**
 * Enhanced Billing Options Component
 * Provides UI for the new billing system with checkbox
 */

import React, { useState } from 'react';

interface BillingOptionsProps {
  billingCycle: string;
  billingDay: number | null;
  billOnLastDay: boolean;
  onBillingCycleChange: (cycle: string) => void;
  onBillingDayChange: (day: number | null) => void;
  onBillOnLastDayChange: (checked: boolean) => void;
}

export default function BillingOptions({
  billingCycle,
  billingDay,
  billOnLastDay,
  onBillingCycleChange,
  onBillingDayChange,
  onBillOnLastDayChange
}: BillingOptionsProps) {
  const [showBillingDay, setShowBillingDay] = useState(billingCycle === 'monthly');

  const handleBillingCycleChange = (cycle: string) => {
    onBillingCycleChange(cycle);
    setShowBillingDay(cycle === 'monthly');
    
    // Reset billing day when changing from monthly to other cycles
    if (cycle !== 'monthly') {
      onBillingDayChange(null);
      onBillOnLastDayChange(false);
    }
  };

  const handleBillOnLastDayChange = (checked: boolean) => {
    onBillOnLastDayChange(checked);
    
    // If checking "bill on last day", we can still keep the billing day for reference
    // but it won't be used for cycle end dates
  };

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Billing Cycle *
        </label>
        <select
          value={billingCycle}
          onChange={(e) => handleBillingCycleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="halfyearly">Half-Yearly</option>
          <option value="yearly">Yearly</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {billingCycle === 'monthly' && 'Bills every month on a specific day'}
          {billingCycle === 'quarterly' && 'Bills quarterly (Mar 31, Jun 30, Sep 30, Dec 31)'}
          {billingCycle === 'halfyearly' && 'Bills half-yearly (Jun 30, Dec 31)'}
          {billingCycle === 'yearly' && 'Bills yearly from sales order start date'}
        </p>
      </div>

      {/* Monthly Billing Options */}
      {showBillingDay && (
        <div className="space-y-4">
          {/* Billing Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Day
            </label>
            <select
              value={billingDay || ''}
              onChange={(e) => onBillingDayChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select day...</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Day of the month when billing cycles end
            </p>
          </div>

          {/* Bill on Last Day Checkbox */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="billOnLastDay"
                  type="checkbox"
                  checked={billOnLastDay}
                  onChange={(e) => handleBillOnLastDayChange(e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="billOnLastDay" className="text-sm font-medium text-blue-900">
                  Bill on last day of month
                </label>
                <p className="text-sm text-blue-700 mt-1">
                  When checked, billing cycles will always end on the last day of each month 
                  (28, 29, 30, or 31 depending on the month), regardless of the billing day above.
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  <strong>Examples:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>January → ends on 31st (31 days)</li>
                    <li>February 2024 → ends on 29th (29 days, leap year)</li>
                    <li>February 2025 → ends on 28th (28 days)</li>
                    <li>April → ends on 30th (30 days)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Preview */}
          {billingDay && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Billing Preview</h4>
              <div className="text-sm text-gray-600">
                {billOnLastDay ? (
                  <div>
                    <p><strong>Cycle End Dates:</strong> Last day of each month</p>
                    <p><strong>Proration:</strong> Based on actual days in each month</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Example: Feb 20-28 = 9 days out of 29 (leap year) or 28 (non-leap year)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p><strong>Cycle End Dates:</strong> {billingDay}th of each month</p>
                    <p><strong>Proration:</strong> Based on {billingDay} days per month</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Example: Feb 20-28 = 9 days out of {billingDay} (if {billingDay} ≤ 28)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Usage example in a form
export function BillingOptionsExample() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [billingDay, setBillingDay] = useState<number | null>(15);
  const [billOnLastDay, setBillOnLastDay] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing Configuration</h2>
      
      <BillingOptions
        billingCycle={billingCycle}
        billingDay={billingDay}
        billOnLastDay={billOnLastDay}
        onBillingCycleChange={setBillingCycle}
        onBillingDayChange={setBillingDay}
        onBillOnLastDayChange={setBillOnLastDay}
      />
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Current Configuration:</h3>
        <div className="text-sm text-gray-600">
          <p>Billing Cycle: {billingCycle}</p>
          {billingCycle === 'monthly' && (
            <>
              <p>Billing Day: {billingDay || 'Not set'}</p>
              <p>Bill on Last Day: {billOnLastDay ? 'Yes' : 'No'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


