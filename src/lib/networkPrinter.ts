/**
 * Network Printer Library for iMin Inner Printer
 * 
 * iMin devices expose their inner printer via HTTP on localhost
 * This library sends ESC/POS commands over HTTP POST
 */

import { Commands, encodeThaiText, type ReceiptData, type ReceiptItem, type TotalsData } from './bluetoothPrinter'

// Default iMin Inner Printer endpoints
const DEFAULT_PRINTER_IP = '127.0.0.1'
const DEFAULT_PRINTER_PORT = 9100  // Standard RAW printing port
const IMIN_HTTP_PORT = 8080  // iMin HTTP print service

export interface NetworkPrinterSettings {
  printerIp: string
  printerPort: number
  useHttp: boolean  // true = HTTP API, false = RAW socket (not available in browser)
  paperWidth: 58 | 80
  storeName: string
  storeAddress: string
  storePhone: string
  footerText: string
  autoPrint: boolean
}

const defaultNetworkSettings: NetworkPrinterSettings = {
  printerIp: DEFAULT_PRINTER_IP,
  printerPort: IMIN_HTTP_PORT,
  useHttp: true,
  paperWidth: 58,
  storeName: 'ร้านน้ำแข็ง แก๊ส น้ำดื่ม',
  storeAddress: '',
  storePhone: '',
  footerText: 'ขอบคุณที่ใช้บริการ',
  autoPrint: false
}

class NetworkPrinter {
  private settings: NetworkPrinterSettings
  private isConnectedFlag: boolean = false

  constructor() {
    this.settings = this.loadSettings()
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): NetworkPrinterSettings {
    if (typeof localStorage === 'undefined') {
      return { ...defaultNetworkSettings }
    }
    const saved = localStorage.getItem('networkPrinterSettings')
    return saved ? { ...defaultNetworkSettings, ...JSON.parse(saved) } : { ...defaultNetworkSettings }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('networkPrinterSettings', JSON.stringify(this.settings))
    }
  }


  /**
   * Get current settings
   */
  getSettings(): NetworkPrinterSettings {
    return { ...this.settings }
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<NetworkPrinterSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
  }

  /**
   * Test connection to printer
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `http://${this.settings.printerIp}:${this.settings.printerPort}/`
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',  // iMin may not support CORS
      })
      this.isConnectedFlag = true
      return true
    } catch {
      this.isConnectedFlag = false
      return false
    }
  }

  /**
   * Connect to printer (test connection and mark as connected)
   */
  async connect(ip?: string, port?: number): Promise<boolean> {
    if (ip) this.settings.printerIp = ip
    if (port) this.settings.printerPort = port
    this.saveSettings()
    
    const connected = await this.testConnection()
    this.isConnectedFlag = connected
    return connected
  }

  /**
   * Disconnect (just mark as disconnected)
   */
  disconnect(): void {
    this.isConnectedFlag = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isConnectedFlag
  }

  /**
   * Get printer IP
   */
  getPrinterIp(): string {
    return this.settings.printerIp
  }

  /**
   * Send raw bytes to printer via HTTP
   */
  async write(data: number[]): Promise<void> {
    const bytes = new Uint8Array(data)
    const blob = new Blob([bytes], { type: 'application/octet-stream' })

    // Try multiple endpoints that iMin might use
    const endpoints = [
      `http://${this.settings.printerIp}:${this.settings.printerPort}/print`,
      `http://${this.settings.printerIp}:${this.settings.printerPort}/`,
      `http://${this.settings.printerIp}:9100/`,
    ]

    let lastError: Error | null = null

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          mode: 'no-cors',  // iMin may not support CORS
        })
        // If we get here without error, print was sent
        return
      } catch (error) {
        lastError = error as Error
        // Try next endpoint
      }
    }

    throw lastError || new Error('ไม่สามารถส่งข้อมูลไปยังเครื่องพิมพ์ได้')
  }

  /**
   * Print text with Thai encoding
   */
  private async printText(text: string): Promise<void> {
    const bytes = encodeThaiText(text)
    await this.write(bytes)
  }

  /**
   * Get line width based on paper size
   */
  getLineWidth(): number {
    return this.settings.paperWidth === 58 ? 32 : 48
  }

  /**
   * Format a line with label on left and value on right
   */
  private formatLine(label: string, value: string, width: number): string {
    const spaces = width - label.length - value.length
    return label + ' '.repeat(Math.max(1, spaces)) + value
  }


  /**
   * Test print
   */
  async testPrint(): Promise<void> {
    const data: number[] = []
    
    // Initialize
    data.push(...Commands.INIT)
    data.push(...Commands.THAI_ENCODING)
    
    // Header
    data.push(...Commands.ALIGN_CENTER)
    data.push(...Commands.SIZE_DOUBLE)
    data.push(...encodeThaiText('ทดสอบเครื่องพิมพ์\n'))
    data.push(...Commands.SIZE_NORMAL)
    data.push(...encodeThaiText('Test Print OK\n'))
    data.push(...encodeThaiText('ภาษาไทย: กขคงจ\n'))
    data.push(...encodeThaiText('ตัวเลข: ๐๑๒๓๔๕๖๗๘๙\n'))
    data.push(...encodeThaiText('สัญลักษณ์: ฿100.00\n'))
    data.push(...encodeThaiText(new Date().toLocaleString('th-TH') + '\n'))
    data.push(...encodeThaiText(`IP: ${this.settings.printerIp}:${this.settings.printerPort}\n`))
    
    // Feed and cut
    data.push(...Commands.FEED_LINES(3))
    data.push(...Commands.CUT_PARTIAL)
    
    await this.write(data)
  }

  /**
   * Print a complete receipt
   */
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    const { paperWidth, storeName, storeAddress, storePhone, footerText } = this.settings
    const lineWidth = paperWidth === 58 ? 32 : 48
    const data: number[] = []

    // Initialize printer
    data.push(...Commands.INIT)
    data.push(...Commands.THAI_ENCODING)

    // Header - Store name (centered, bold, large)
    data.push(...Commands.ALIGN_CENTER)
    data.push(...Commands.SIZE_DOUBLE)
    data.push(...Commands.BOLD_ON)
    data.push(...encodeThaiText(storeName + '\n'))
    data.push(...Commands.SIZE_NORMAL)
    data.push(...Commands.BOLD_OFF)

    // Store address & phone
    if (storeAddress && storeAddress.trim()) {
      data.push(...encodeThaiText(storeAddress + '\n'))
    }
    if (storePhone && storePhone.trim()) {
      data.push(...encodeThaiText('โทร: ' + storePhone + '\n'))
    }

    // Separator
    data.push(...encodeThaiText('='.repeat(lineWidth) + '\n'))

    // Receipt info
    data.push(...Commands.ALIGN_LEFT)
    data.push(...encodeThaiText(`เลขที่: ${receiptData.receiptNo}\n`))
    data.push(...encodeThaiText(`วันที่: ${receiptData.date} ${receiptData.time}\n`))
    data.push(...encodeThaiText(`พนักงาน: ${receiptData.staffName}\n`))

    if (receiptData.customerName) {
      data.push(...encodeThaiText(`ลูกค้า: ${receiptData.customerName}\n`))
    }

    // Separator
    data.push(...encodeThaiText('-'.repeat(lineWidth) + '\n'))

    // Items
    for (const item of receiptData.items) {
      const maxNameLength = lineWidth - 2
      const displayName = item.name.length > maxNameLength 
        ? item.name.substring(0, maxNameLength - 2) + '..'
        : item.name

      data.push(...encodeThaiText(displayName + '\n'))

      const qtyStr = `x${item.quantity}`
      const priceStr = item.price.toLocaleString()
      const subtotalStr = item.subtotal.toLocaleString()
      const priceLine = `  ${qtyStr} @ ${priceStr} = ${subtotalStr}`
      data.push(...encodeThaiText(priceLine.padStart(lineWidth) + '\n'))

      if (item.note && item.note.trim()) {
        data.push(...encodeThaiText(`  (${item.note})\n`))
      }
    }

    // Separator
    data.push(...encodeThaiText('-'.repeat(lineWidth) + '\n'))

    // Totals
    const paymentMethodText: Record<string, string> = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit: 'วางบิล'
    }

    if (receiptData.discount > 0) {
      data.push(...encodeThaiText(this.formatLine('ส่วนลด', `-${receiptData.discount.toLocaleString()}`, lineWidth) + '\n'))
    }

    data.push(...Commands.BOLD_ON)
    data.push(...encodeThaiText(this.formatLine('รวมทั้งสิ้น', receiptData.total.toLocaleString() + ' บาท', lineWidth) + '\n'))
    data.push(...Commands.BOLD_OFF)

    data.push(...encodeThaiText(this.formatLine('ชำระโดย', paymentMethodText[receiptData.paymentMethod], lineWidth) + '\n'))

    if (receiptData.paymentMethod === 'cash') {
      data.push(...encodeThaiText(this.formatLine('รับเงิน', receiptData.payment.toLocaleString() + ' บาท', lineWidth) + '\n'))
      data.push(...encodeThaiText(this.formatLine('เงินทอน', receiptData.change.toLocaleString() + ' บาท', lineWidth) + '\n'))
    }

    // Points
    if (receiptData.pointsEarned || receiptData.pointsUsed) {
      data.push(...encodeThaiText('-'.repeat(lineWidth) + '\n'))
      if (receiptData.pointsUsed) {
        data.push(...encodeThaiText(this.formatLine('ใช้แต้ม', `-${receiptData.pointsUsed}`, lineWidth) + '\n'))
      }
      if (receiptData.pointsEarned) {
        data.push(...encodeThaiText(this.formatLine('แต้มที่ได้', `+${receiptData.pointsEarned}`, lineWidth) + '\n'))
      }
      if (receiptData.totalPoints !== undefined) {
        data.push(...encodeThaiText(this.formatLine('แต้มสะสม', receiptData.totalPoints.toString(), lineWidth) + '\n'))
      }
    }

    // Footer
    data.push(...encodeThaiText('='.repeat(lineWidth) + '\n'))
    data.push(...Commands.ALIGN_CENTER)
    data.push(...encodeThaiText(footerText + '\n'))

    // Feed and cut
    data.push(...Commands.FEED_LINES(4))
    data.push(...Commands.CUT_PARTIAL)

    await this.write(data)
  }
}

// Export singleton instance
export const networkPrinter = new NetworkPrinter()
export { NetworkPrinter }
