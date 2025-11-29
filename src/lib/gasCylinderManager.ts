import { Product, GasSaleType } from '../types'
import { supabase } from './supabase'

/**
 * Stock change type for gas cylinder operations
 */
export interface StockChange {
  type: 'full' | 'empty'
  amount: number
}

/**
 * Result of a gas sale operation
 */
export interface GasSaleResult {
  saleType: GasSaleType
  price: number
  depositAmount: number
  totalPrice: number
  stockChanges: StockChange[]
}

/**
 * Result of a cylinder return operation
 */
export interface CylinderReturnResult {
  refundAmount: number
  stockChanges: StockChange[]
}

/**
 * GasCylinderManager - Handles all gas cylinder business logic
 * 
 * Gas Sale Types:
 * - exchange: Customer has empty cylinder to exchange (แลกถัง)
 * - deposit: Customer buys new cylinder with deposit (ซื้อพร้อมมัดจำ)
 * - outright: Customer buys cylinder outright, no return needed (ซื้อขาด)
 */
export class GasCylinderManager {
  /**
   * Handle gas sale based on sale type
   * 
   * @param product - The gas product being sold
   * @param quantity - Number of cylinders
   * @param saleType - Type of gas sale (exchange, deposit, or outright)
   * @returns GasSaleResult with pricing and stock changes
   */
  static handleGasSale(
    product: Product,
    quantity: number,
    saleType: GasSaleType
  ): GasSaleResult {
    const depositAmount = product.deposit_amount || 0
    const outrightPrice = product.outright_price || (product.price + depositAmount + 500)

    if (saleType === 'exchange') {
      // Exchange: Customer has empty cylinder
      // Charge only gas price, swap cylinders
      return {
        saleType: 'exchange',
        price: product.price * quantity,
        depositAmount: 0,
        totalPrice: product.price * quantity,
        stockChanges: [
          { type: 'full', amount: -quantity },  // Decrease full stock
          { type: 'empty', amount: quantity }   // Increase empty stock
        ]
      }
    } else if (saleType === 'outright') {
      // Outright: Customer buys cylinder permanently
      // Charge outright price, no cylinder return expected
      return {
        saleType: 'outright',
        price: outrightPrice * quantity,
        depositAmount: 0,
        totalPrice: outrightPrice * quantity,
        stockChanges: [
          { type: 'full', amount: -quantity }  // Only decrease full stock, no empty return
        ]
      }
    } else {
      // Deposit: Customer needs to pay deposit for new cylinder
      return {
        saleType: 'deposit',
        price: product.price * quantity,
        depositAmount: depositAmount * quantity,
        totalPrice: (product.price + depositAmount) * quantity,
        stockChanges: [
          { type: 'full', amount: -quantity }  // Only decrease full stock
        ]
      }
    }
  }

  /**
   * Handle cylinder return and refund deposit
   * 
   * @param product - The gas product (cylinder type)
   * @param quantity - Number of cylinders being returned
   * @returns CylinderReturnResult with refund amount and stock changes
   */
  static handleCylinderReturn(
    product: Product,
    quantity: number
  ): CylinderReturnResult {
    const depositAmount = product.deposit_amount || 0

    return {
      refundAmount: depositAmount * quantity,
      stockChanges: [
        { type: 'empty', amount: quantity }  // Increase empty stock
      ]
    }
  }

  /**
   * Handle refilling empty cylinders (converting empty to full)
   * Used when receiving refilled cylinders from supplier
   * 
   * @param product - The gas product
   * @param quantity - Number of cylinders refilled
   * @returns Stock changes for the refill operation
   */
  static handleRefill(
    product: Product,
    quantity: number
  ): StockChange[] {
    return [
      { type: 'empty', amount: -quantity },  // Decrease empty stock
      { type: 'full', amount: quantity }     // Increase full stock
    ]
  }

  /**
   * Apply stock changes to database
   * 
   * @param productId - Product ID to update
   * @param stockChanges - Array of stock changes to apply
   * @param reason - Reason for stock log
   * @param userId - User making the change (optional)
   * @param note - Additional note (optional)
   */
  static async applyStockChanges(
    productId: string,
    stockChanges: StockChange[],
    reason: 'exchange' | 'deposit_sale' | 'deposit_return' | 'refill' | 'outright_sale',
    userId?: string,
    note?: string
  ): Promise<void> {
    // Get current product
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, empty_stock')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      throw new Error('Product not found')
    }

    // Calculate new stock values
    let newStock = product.stock
    let newEmptyStock = product.empty_stock || 0

    for (const change of stockChanges) {
      if (change.type === 'full') {
        newStock = Math.max(0, newStock + change.amount)
      } else {
        newEmptyStock = Math.max(0, newEmptyStock + change.amount)
      }
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock: newStock,
        empty_stock: newEmptyStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (updateError) {
      throw new Error('Failed to update stock')
    }

    // Create stock log
    const totalChange = stockChanges.reduce((sum, c) => {
      return c.type === 'full' ? sum + c.amount : sum
    }, 0)

    await supabase.from('stock_logs').insert({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      product_id: productId,
      change_amount: totalChange,
      reason,
      note,
      user_id: userId || null,
      created_at: new Date().toISOString()
    })
  }

  /**
   * Process cylinder return transaction
   * 
   * @param productId - Gas product ID
   * @param quantity - Number of cylinders returned
   * @param userId - User processing the return
   * @param note - Optional note
   * @returns Refund amount
   */
  static async processCylinderReturn(
    productId: string,
    quantity: number,
    userId?: string,
    note?: string
  ): Promise<number> {
    // Get product details
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error || !product) {
      throw new Error('Product not found')
    }

    const result = this.handleCylinderReturn(product as Product, quantity)

    // Apply stock changes
    await this.applyStockChanges(
      productId,
      result.stockChanges,
      'deposit_return',
      userId,
      note || `คืนถังแก๊ส ${quantity} ถัง`
    )

    return result.refundAmount
  }

  /**
   * Process gas refill (empty to full conversion)
   * 
   * @param productId - Gas product ID
   * @param quantity - Number of cylinders refilled
   * @param userId - User processing the refill
   * @param note - Optional note
   */
  static async processRefill(
    productId: string,
    quantity: number,
    userId?: string,
    note?: string
  ): Promise<void> {
    // Get product details
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error || !product) {
      throw new Error('Product not found')
    }

    // Check if we have enough empty cylinders
    if ((product.empty_stock || 0) < quantity) {
      throw new Error(`ถังเปล่าไม่พอ (มี ${product.empty_stock || 0} ถัง)`)
    }

    const stockChanges = this.handleRefill(product as Product, quantity)

    // Apply stock changes
    await this.applyStockChanges(
      productId,
      stockChanges,
      'refill',
      userId,
      note || `เติมแก๊สถังเปล่า ${quantity} ถัง`
    )
  }

  /**
   * Check if product is a gas product
   */
  static isGasProduct(product: Product): boolean {
    return product.category === 'gas'
  }

  /**
   * Calculate total price for gas sale
   */
  static calculateGasPrice(
    product: Product,
    quantity: number,
    saleType: GasSaleType
  ): { price: number; deposit: number; total: number } {
    const depositAmount = product.deposit_amount || 0
    const outrightPrice = product.outright_price || (product.price + depositAmount + 500)

    if (saleType === 'exchange') {
      return {
        price: product.price * quantity,
        deposit: 0,
        total: product.price * quantity
      }
    } else if (saleType === 'outright') {
      return {
        price: outrightPrice * quantity,
        deposit: 0,
        total: outrightPrice * quantity
      }
    } else {
      return {
        price: product.price * quantity,
        deposit: depositAmount * quantity,
        total: (product.price + depositAmount) * quantity
      }
    }
  }

  /**
   * Get display label for gas sale type
   */
  static getSaleTypeLabel(saleType: GasSaleType): string {
    switch (saleType) {
      case 'exchange': return 'แลกถัง'
      case 'deposit': return 'มัดจำ'
      case 'outright': return 'ซื้อขาด'
      default: return saleType
    }
  }
}
