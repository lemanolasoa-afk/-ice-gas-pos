/**
 * Payment calculation utilities
 * Requirements: 3.2, 3.3
 */

/**
 * Calculate change from payment
 * @param payment - Amount received from customer
 * @param total - Total amount to pay
 * @returns Change amount (payment - total)
 */
export function calculateChange(payment: number, total: number): number {
  return payment - total
}

/**
 * Validate if payment is sufficient
 * @param payment - Amount received from customer
 * @param total - Total amount to pay
 * @returns true if payment >= total
 */
export function isPaymentValid(payment: number, total: number): boolean {
  return payment >= total
}

/**
 * Add quick amount to current payment input
 * @param currentPayment - Current payment amount
 * @param quickAmount - Quick amount to add
 * @returns New payment amount
 */
export function addQuickAmount(currentPayment: number, quickAmount: number): number {
  return currentPayment + quickAmount
}

/**
 * Payment validation result
 */
export interface PaymentValidation {
  isValid: boolean
  change: number
  message: string
}

/**
 * Validate payment and return detailed result
 * @param payment - Amount received from customer
 * @param total - Total amount to pay
 * @returns PaymentValidation object with isValid, change, and message
 */
export function validatePayment(payment: number, total: number): PaymentValidation {
  const change = calculateChange(payment, total)
  const isValid = isPaymentValid(payment, total)
  
  return {
    isValid,
    change,
    message: isValid ? 'เงินทอน' : 'เงินไม่พอ'
  }
}
