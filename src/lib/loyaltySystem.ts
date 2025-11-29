/**
 * LoyaltySystem - ระบบสะสมแต้มลูกค้า
 * 
 * อัตราการสะสม: 1 บาท = 1 แต้ม (ปัดลง)
 * อัตราการแลก: 1 แต้ม = 1 บาท
 */

import { Customer } from '../types'
import { supabase } from './supabase'

// Constants for loyalty program
export const POINTS_PER_BAHT = 1  // 1 บาท = 1 แต้ม
export const BAHT_PER_POINT = 1  // 1 แต้ม = 1 บาท

export class LoyaltySystem {
  /**
   * Calculate points earned from a purchase
   * Points = floor(total amount in baht)
   * 
   * @param totalAmount - Total purchase amount in baht
   * @returns Number of points earned
   */
  static calculatePointsEarned(totalAmount: number): number {
    if (totalAmount <= 0) return 0
    return Math.floor(totalAmount * POINTS_PER_BAHT)
  }

  /**
   * Calculate discount amount from points
   * 1 point = 1 baht discount
   * 
   * @param pointsToUse - Number of points to use
   * @returns Discount amount in baht
   */
  static calculatePointsDiscount(pointsToUse: number): number {
    if (pointsToUse <= 0) return 0
    return pointsToUse * BAHT_PER_POINT
  }

  /**
   * Validate if points usage is valid
   * - Points must be non-negative
   * - Points must not exceed customer's balance
   * - Points discount must not exceed purchase total
   * 
   * @param customer - Customer object
   * @param pointsToUse - Number of points to use
   * @param purchaseTotal - Total purchase amount
   * @returns Validation result with isValid flag and error message
   */
  static validatePointsUsage(
    customer: Customer | null,
    pointsToUse: number,
    purchaseTotal: number
  ): { isValid: boolean; error?: string; maxPoints: number } {
    // No customer selected
    if (!customer) {
      return {
        isValid: pointsToUse === 0,
        error: pointsToUse > 0 ? 'กรุณาเลือกลูกค้าก่อนใช้แต้ม' : undefined,
        maxPoints: 0
      }
    }

    // Calculate max usable points (min of customer balance and purchase total)
    const maxPoints = Math.min(customer.points, Math.floor(purchaseTotal))

    // Negative points
    if (pointsToUse < 0) {
      return {
        isValid: false,
        error: 'จำนวนแต้มต้องไม่ติดลบ',
        maxPoints
      }
    }

    // Exceeds customer balance
    if (pointsToUse > customer.points) {
      return {
        isValid: false,
        error: `แต้มไม่เพียงพอ (มี ${customer.points} แต้ม)`,
        maxPoints
      }
    }

    // Exceeds purchase total
    if (pointsToUse > purchaseTotal) {
      return {
        isValid: false,
        error: `ใช้แต้มได้ไม่เกินยอดซื้อ (${Math.floor(purchaseTotal)} แต้ม)`,
        maxPoints
      }
    }

    return { isValid: true, maxPoints }
  }

  /**
   * Update customer record after a sale
   * - Deduct points used
   * - Add points earned
   * - Update total_spent
   * - Increment visit_count
   * 
   * @param customerId - Customer ID
   * @param pointsUsed - Points used in this sale
   * @param pointsEarned - Points earned from this sale
   * @param saleTotal - Total sale amount
   * @returns Updated customer or null if failed
   */
  static async updateCustomerAfterSale(
    customerId: string,
    pointsUsed: number,
    pointsEarned: number,
    saleTotal: number
  ): Promise<Customer | null> {
    try {
      // First, get current customer data
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (fetchError || !customer) {
        console.error('Failed to fetch customer:', fetchError)
        return null
      }

      // Calculate new values
      const newPoints = customer.points - pointsUsed + pointsEarned
      const newTotalSpent = customer.total_spent + saleTotal
      const newVisitCount = customer.visit_count + 1

      // Update customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          points: newPoints,
          total_spent: newTotalSpent,
          visit_count: newVisitCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update customer:', updateError)
        return null
      }

      return updatedCustomer
    } catch (err) {
      console.error('Error updating customer after sale:', err)
      return null
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) {
      console.error('Failed to fetch customer:', error)
      return null
    }

    return data
  }

  /**
   * Calculate new points balance after a transaction
   * 
   * @param currentPoints - Current points balance
   * @param pointsUsed - Points to deduct
   * @param pointsEarned - Points to add
   * @returns New points balance
   */
  static calculateNewBalance(
    currentPoints: number,
    pointsUsed: number,
    pointsEarned: number
  ): number {
    return Math.max(0, currentPoints - pointsUsed + pointsEarned)
  }
}
