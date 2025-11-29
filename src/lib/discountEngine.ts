import { Discount, CartItem } from '../types'

/**
 * DiscountEngine - ระบบคำนวณส่วนลดและโปรโมชั่น
 * 
 * รองรับ 3 ประเภท:
 * - percent: ส่วนลดเปอร์เซ็นต์ (เช่น ลด 10%)
 * - fixed: ส่วนลดจำนวนเงินคงที่ (เช่น ลด 50 บาท)
 * - buy_x_get_y: ซื้อ X แถม Y (เช่น ซื้อ 2 แถม 1)
 */

export interface DiscountValidationResult {
  isValid: boolean
  error?: string
  discountAmount: number
}

export interface DiscountCalculationResult {
  discountAmount: number
  freeItems?: number  // For buy_x_get_y
  description: string
}

export class DiscountEngine {
  /**
   * ตรวจสอบว่าส่วนลดใช้ได้หรือไม่
   */
  static validateDiscount(
    discount: Discount | null,
    cartTotal: number,
    cart: CartItem[] = []
  ): DiscountValidationResult {
    if (!discount) {
      return { isValid: false, error: 'ไม่พบส่วนลด', discountAmount: 0 }
    }

    // Check if discount is active
    if (!discount.is_active) {
      return { isValid: false, error: 'ส่วนลดนี้ไม่ได้เปิดใช้งาน', discountAmount: 0 }
    }

    // Check date range
    const now = new Date()
    if (discount.start_date && new Date(discount.start_date) > now) {
      return { isValid: false, error: 'ส่วนลดยังไม่เริ่มใช้งาน', discountAmount: 0 }
    }
    if (discount.end_date && new Date(discount.end_date) < now) {
      return { isValid: false, error: 'ส่วนลดหมดอายุแล้ว', discountAmount: 0 }
    }

    // Check minimum purchase
    if (discount.min_purchase > 0 && cartTotal < discount.min_purchase) {
      return { 
        isValid: false, 
        error: `ยอดซื้อขั้นต่ำ ฿${discount.min_purchase}`, 
        discountAmount: 0 
      }
    }

    // For buy_x_get_y, check if product is in cart with sufficient quantity
    if (discount.type === 'buy_x_get_y') {
      const buyQty = discount.buy_quantity || 0
      const getQty = discount.get_quantity || 0
      
      if (buyQty <= 0 || getQty <= 0) {
        return { isValid: false, error: 'ข้อมูลโปรโมชั่นไม่ถูกต้อง', discountAmount: 0 }
      }

      // If product_id is specified, check that specific product
      if (discount.product_id) {
        const cartItem = cart.find(item => item.product.id === discount.product_id)
        if (!cartItem || cartItem.quantity < buyQty) {
          return { 
            isValid: false, 
            error: `ต้องซื้อสินค้าอย่างน้อย ${buyQty} ชิ้น`, 
            discountAmount: 0 
          }
        }
      } else {
        // Check total quantity in cart
        const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
        if (totalQty < buyQty) {
          return { 
            isValid: false, 
            error: `ต้องซื้อสินค้าอย่างน้อย ${buyQty} ชิ้น`, 
            discountAmount: 0 
          }
        }
      }
    }

    // Calculate discount amount
    const calculation = this.calculateDiscount(discount, cartTotal, cart)
    
    return { 
      isValid: true, 
      discountAmount: calculation.discountAmount 
    }
  }

  /**
   * คำนวณจำนวนส่วนลด
   */
  static calculateDiscount(
    discount: Discount,
    cartTotal: number,
    cart: CartItem[] = []
  ): DiscountCalculationResult {
    switch (discount.type) {
      case 'percent':
        return this.calculatePercentDiscount(discount, cartTotal)
      case 'fixed':
        return this.calculateFixedDiscount(discount, cartTotal)
      case 'buy_x_get_y':
        return this.calculateBuyXGetY(discount, cart)
      default:
        return { discountAmount: 0, description: 'ประเภทส่วนลดไม่ถูกต้อง' }
    }
  }

  /**
   * คำนวณส่วนลดแบบเปอร์เซ็นต์
   */
  static calculatePercentDiscount(
    discount: Discount,
    cartTotal: number
  ): DiscountCalculationResult {
    const percent = Math.min(100, Math.max(0, discount.value))
    const discountAmount = Math.floor(cartTotal * (percent / 100))
    
    return {
      discountAmount,
      description: `ลด ${percent}%`
    }
  }

  /**
   * คำนวณส่วนลดแบบจำนวนเงินคงที่
   */
  static calculateFixedDiscount(
    discount: Discount,
    cartTotal: number
  ): DiscountCalculationResult {
    // Fixed discount cannot exceed cart total
    const discountAmount = Math.min(discount.value, cartTotal)
    
    return {
      discountAmount: Math.floor(discountAmount),
      description: `ลด ฿${discount.value}`
    }
  }

  /**
   * คำนวณส่วนลดแบบซื้อ X แถม Y
   */
  static calculateBuyXGetY(
    discount: Discount,
    cart: CartItem[]
  ): DiscountCalculationResult {
    const buyQty = discount.buy_quantity || 0
    const getQty = discount.get_quantity || 0
    
    if (buyQty <= 0 || getQty <= 0) {
      return { discountAmount: 0, freeItems: 0, description: 'ข้อมูลไม่ถูกต้อง' }
    }

    let eligibleItems: CartItem[] = []
    
    // If product_id is specified, only that product is eligible
    if (discount.product_id) {
      const item = cart.find(i => i.product.id === discount.product_id)
      if (item) {
        eligibleItems = [item]
      }
    } else {
      // All items are eligible
      eligibleItems = cart
    }

    // Calculate how many sets of buy_x_get_y can be applied
    const totalQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0)
    const setSize = buyQty + getQty
    const numSets = Math.floor(totalQty / setSize)
    const freeItems = numSets * getQty

    if (freeItems <= 0) {
      return { 
        discountAmount: 0, 
        freeItems: 0, 
        description: `ซื้อ ${buyQty} แถม ${getQty}` 
      }
    }

    // Calculate discount based on cheapest items (free items are cheapest)
    // Sort items by price ascending
    const sortedItems = [...eligibleItems].sort((a, b) => a.product.price - b.product.price)
    
    let discountAmount = 0
    let remainingFreeItems = freeItems
    
    for (const item of sortedItems) {
      if (remainingFreeItems <= 0) break
      
      const freeFromThisItem = Math.min(remainingFreeItems, item.quantity)
      discountAmount += freeFromThisItem * item.product.price
      remainingFreeItems -= freeFromThisItem
    }

    return {
      discountAmount: Math.floor(discountAmount),
      freeItems,
      description: `ซื้อ ${buyQty} แถม ${getQty} (ฟรี ${freeItems} ชิ้น)`
    }
  }

  /**
   * กรองเฉพาะส่วนลดที่ใช้งานได้
   */
  static getActiveDiscounts(discounts: Discount[]): Discount[] {
    const now = new Date()
    
    return discounts.filter(discount => {
      if (!discount.is_active) return false
      
      if (discount.start_date && new Date(discount.start_date) > now) return false
      if (discount.end_date && new Date(discount.end_date) < now) return false
      
      return true
    })
  }

  /**
   * กรองส่วนลดที่ใช้ได้กับยอดซื้อปัจจุบัน
   */
  static getApplicableDiscounts(
    discounts: Discount[],
    cartTotal: number,
    cart: CartItem[] = []
  ): Discount[] {
    const activeDiscounts = this.getActiveDiscounts(discounts)
    
    return activeDiscounts.filter(discount => {
      const validation = this.validateDiscount(discount, cartTotal, cart)
      return validation.isValid
    })
  }

  /**
   * สร้าง label สำหรับแสดงผล
   */
  static getDiscountLabel(discount: Discount): string {
    switch (discount.type) {
      case 'percent':
        return `ลด ${discount.value}%`
      case 'fixed':
        return `ลด ฿${discount.value}`
      case 'buy_x_get_y':
        return `ซื้อ ${discount.buy_quantity} แถม ${discount.get_quantity}`
      default:
        return discount.name
    }
  }
}
