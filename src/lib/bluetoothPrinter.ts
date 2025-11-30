/**
 * Bluetooth Thermal Printer Library
 * Requirements: REQ-1, REQ-2, REQ-3, REQ-4
 * 
 * Supports ESC/POS compatible thermal printers via Web Bluetooth API
 * Paper sizes: 58mm (32 chars) and 80mm (48 chars)
 */

// ===== ESC/POS Command Constants =====
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

export const Commands = {
  // Initialize
  INIT: [ESC, 0x40],  // ESC @
  
  // Text alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],    // ESC a 0
  ALIGN_CENTER: [ESC, 0x61, 0x01],  // ESC a 1
  ALIGN_RIGHT: [ESC, 0x61, 0x02],   // ESC a 2
  
  // Text style
  BOLD_ON: [ESC, 0x45, 0x01],   // ESC E 1
  BOLD_OFF: [ESC, 0x45, 0x00],  // ESC E 0
  
  // Text size (GS ! n)
  SIZE_NORMAL: [GS, 0x21, 0x00],        // Normal
  SIZE_DOUBLE_HEIGHT: [GS, 0x21, 0x01], // Double height
  SIZE_DOUBLE_WIDTH: [GS, 0x21, 0x10],  // Double width
  SIZE_DOUBLE: [GS, 0x21, 0x11],        // Double both
  
  // Line feed
  LINE_FEED: [LF],
  FEED_LINES: (n: number) => [ESC, 0x64, n],  // ESC d n
  
  // Cut paper
  CUT_PARTIAL: [GS, 0x56, 0x01],  // GS V 1
  CUT_FULL: [GS, 0x56, 0x00],     // GS V 0
  
  // Thai encoding (TIS-620 / Code Page 874)
  THAI_ENCODING: [ESC, 0x74, 0x15],  // ESC t 21 (Thai TIS-620)
  // Alternative Thai code pages for different printer models
  THAI_CP874: [ESC, 0x74, 0x1C],     // ESC t 28 (Windows CP874)
}

// ===== Thai Encoding Support (TIS-620) =====

/**
 * Unicode to TIS-620 mapping for Thai characters
 * Thai Unicode range: U+0E00 to U+0E7F
 * TIS-620 range: 0xA1 to 0xFB
 * 
 * TIS-620 is the Thai Industrial Standard for Thai character encoding
 * It maps Thai characters from Unicode 0x0E01-0x0E5B to bytes 0xA1-0xFB
 */

/**
 * Convert a single Unicode code point to TIS-620 byte
 * @param codePoint - Unicode code point
 * @returns TIS-620 byte or null if not a Thai character
 */
export function unicodeToTIS620(codePoint: number): number | null {
  // Thai consonants, vowels, tone marks, and digits
  // Unicode range: U+0E01 to U+0E5B
  // TIS-620 range: 0xA1 to 0xFB
  if (codePoint >= 0x0E01 && codePoint <= 0x0E5B) {
    return codePoint - 0x0E01 + 0xA1
  }
  
  // Thai Baht sign (฿) - U+0E3F maps to 0xDF in TIS-620
  if (codePoint === 0x0E3F) {
    return 0xDF
  }
  
  return null
}

/**
 * Check if a character is a Thai character
 * @param char - Single character string
 * @returns true if Thai character
 */
export function isThaiChar(char: string): boolean {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) return false
  return codePoint >= 0x0E00 && codePoint <= 0x0E7F
}

/**
 * Encode a string to TIS-620 bytes for Thai thermal printers
 * - Thai characters are converted to TIS-620 (single byte)
 * - ASCII characters (0x00-0x7F) are passed through
 * - Other characters are replaced with '?' (0x3F)
 * 
 * @param text - Input string (may contain Thai and ASCII)
 * @returns Array of bytes in TIS-620 encoding
 */
export function encodeThaiText(text: string): number[] {
  const bytes: number[] = []
  
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) continue
    
    // ASCII characters (0x00-0x7F) - pass through
    if (codePoint <= 0x7F) {
      bytes.push(codePoint)
      continue
    }
    
    // Thai characters - convert to TIS-620
    const tis620Byte = unicodeToTIS620(codePoint)
    if (tis620Byte !== null) {
      bytes.push(tis620Byte)
      continue
    }
    
    // Other characters - replace with '?'
    bytes.push(0x3F)
  }
  
  return bytes
}

/**
 * Decode TIS-620 bytes back to Unicode string
 * Useful for testing and verification
 * 
 * @param bytes - Array of TIS-620 encoded bytes
 * @returns Decoded Unicode string
 */
export function decodeTIS620(bytes: number[]): string {
  let result = ''
  
  for (const byte of bytes) {
    // ASCII characters (0x00-0x7F)
    if (byte <= 0x7F) {
      result += String.fromCharCode(byte)
      continue
    }
    
    // TIS-620 Thai characters (0xA1-0xFB) -> Unicode (0x0E01-0x0E5B)
    if (byte >= 0xA1 && byte <= 0xFB) {
      const codePoint = byte - 0xA1 + 0x0E01
      result += String.fromCharCode(codePoint)
      continue
    }
    
    // Invalid byte - replace with replacement character
    result += '\uFFFD'
  }
  
  return result
}

// ===== Type Definitions =====

export type TextAlignment = 'left' | 'center' | 'right'
export type TextSize = 'normal' | 'double-height' | 'double-width' | 'double'
export type CutType = 'partial' | 'full'

export interface PrinterSettings {
  // Device
  deviceId: string | null
  deviceName: string | null
  isConnected: boolean
  
  // Paper
  paperWidth: 58 | 80  // mm
  
  // Store Info
  storeName: string
  storeAddress: string
  storePhone: string
  footerText: string
  
  // Behavior
  autoPrint: boolean  // พิมพ์อัตโนมัติหลังขาย
}

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  subtotal: number
  note?: string  // เช่น "แลกถัง" หรือ "มัดจำ 200฿"
}

/**
 * Totals data for receipt formatting
 * Used by formatTotals and printTotals methods
 */
export interface TotalsData {
  discount: number
  total: number
  payment: number
  change: number
  paymentMethod: 'cash' | 'transfer' | 'credit'
}

export interface ReceiptData {
  // Header
  receiptNo: string
  date: string
  time: string
  
  // Items
  items: ReceiptItem[]
  
  // Totals
  subtotal: number
  discount: number
  total: number
  payment: number
  change: number
  paymentMethod: 'cash' | 'transfer' | 'credit'
  
  // Customer
  customerName?: string
  pointsEarned?: number
  pointsUsed?: number
  totalPoints?: number
  
  // Staff
  staffName: string
}

// Default settings
const defaultPrinterSettings: PrinterSettings = {
  deviceId: null,
  deviceName: null,
  isConnected: false,
  paperWidth: 58,
  storeName: 'ร้านน้ำแข็ง แก๊ส น้ำดื่ม',
  storeAddress: '',
  storePhone: '',
  footerText: 'ขอบคุณที่ใช้บริการ',
  autoPrint: false
}

// Bluetooth Service UUIDs for thermal printers
const PRINTER_SERVICE_UUIDS = [
  '0000ff00-0000-1000-8000-00805f9b34fb',  // Generic Serial Port
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',  // Specific Printer Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',  // Inner Printer / ISSC Transparent Service
  '000018f0-0000-1000-8000-00805f9b34fb',  // Inner Printer Alternative
  '0000ffe0-0000-1000-8000-00805f9b34fb',  // iMin Inner Printer Service
  '00001101-0000-1000-8000-00805f9b34fb',  // Serial Port Profile (SPP)
]

// Characteristic UUIDs for different printer types
const PRINTER_CHARACTERISTIC_UUIDS = [
  '0000ff02-0000-1000-8000-00805f9b34fb',  // Generic Write Characteristic
  '49535343-8841-43f4-a8d4-ecbe34729bb3',  // Inner Printer / ISSC Write Characteristic
  '000018f1-0000-1000-8000-00805f9b34fb',  // Inner Printer Alternative Write
  '49535343-1e4d-4bd9-ba61-23c647249616',  // ISSC Transparent TX
  '0000ffe1-0000-1000-8000-00805f9b34fb',  // iMin Inner Printer Write Characteristic
  '0000ffe2-0000-1000-8000-00805f9b34fb',  // iMin Alternative Write
]

// ===== BluetoothPrinter Class =====


class BluetoothPrinter {
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private settings: PrinterSettings
  private onDisconnectCallback: (() => void) | null = null

  constructor() {
    this.settings = this.loadSettings()
  }

  /**
   * Set callback for connection lost events
   * This allows the UI to be notified immediately when connection is lost
   * @param callback - Function to call when connection is lost
   */
  setOnDisconnect(callback: (() => void) | null): void {
    this.onDisconnectCallback = callback
  }

  /**
   * Handle GATT server disconnection
   * Updates state and notifies callback
   */
  private handleDisconnect = (): void => {
    console.log('Bluetooth printer disconnected')
    this.settings.isConnected = false
    this.saveSettings()
    
    // Notify callback if set
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback()
    }
  }

  /**
   * Check if Web Bluetooth is supported
   * AC-1.1: ตรวจสอบว่ารองรับ Web Bluetooth หรือไม่
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  /**
   * Request and connect to a Bluetooth printer
   * AC-1.2, AC-1.3: แสดงรายการเครื่องพิมพ์และจับคู่
   * 
   * Error messages (user-friendly Thai):
   * - "อุปกรณ์ไม่รองรับ Bluetooth" - Web Bluetooth not supported
   * - "ไม่สามารถเชื่อมต่อเครื่องพิมพ์ได้" - GATT connection failed
   * - "เครื่องพิมพ์ไม่รองรับ" - No compatible service found
   * - "ไม่พบช่องทางสื่อสารกับเครื่องพิมพ์" - No writable characteristic
   */
  async connect(): Promise<boolean> {
    if (!BluetoothPrinter.isSupported()) {
      throw new Error('อุปกรณ์ไม่รองรับ Bluetooth - กรุณาใช้ Chrome บน Android หรือ Desktop')
    }

    try {
      // Request device with printer filters
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUIDS[0]] },
          { services: [PRINTER_SERVICE_UUIDS[1]] },
          { services: [PRINTER_SERVICE_UUIDS[2]] },  // Inner Printer
          { services: [PRINTER_SERVICE_UUIDS[3]] },  // Inner Printer Alt
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'PT-' },
          { namePrefix: 'MPT-' },
          { namePrefix: 'XP-' },
          { namePrefix: 'Inner' },      // Inner Printer
          { namePrefix: 'inner' },      // innerprinter (lowercase)
          { namePrefix: 'InnerPrinter' },
          { namePrefix: 'innerprinter' },  // iMin innerprinter
          { namePrefix: 'BlueTooth' },  // Generic Bluetooth Printer
          { namePrefix: 'BT-' },        // Bluetooth Printer
          { namePrefix: 'Gprinter' },   // Gprinter brand
          { namePrefix: 'GP-' },        // Gprinter
          { namePrefix: 'iMin' },       // iMin POS devices
          { namePrefix: 'IMIN' },       // iMin uppercase
          { namePrefix: 'D1' },         // iMin D1 series
          { namePrefix: 'D2' },         // iMin D2 series
          { namePrefix: 'D3' },         // iMin D3 series
          { namePrefix: 'D4' },         // iMin D4 series
          { namePrefix: 'M2' },         // iMin M2 series
          { namePrefix: 'Swift' },      // iMin Swift series
          { namePrefix: 'Falcon' },     // iMin Falcon series
        ],
        optionalServices: PRINTER_SERVICE_UUIDS
      })

      // Connect to GATT server
      const server = await this.device.gatt?.connect()
      if (!server) throw new Error('ไม่สามารถเชื่อมต่อเครื่องพิมพ์ได้ - ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่')

      // Try to get service from available UUIDs
      let service: BluetoothRemoteGATTService | null = null
      for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(uuid)
          if (service) break
        } catch {
          // Try next UUID
        }
      }

      if (!service) throw new Error('เครื่องพิมพ์ไม่รองรับ - กรุณาใช้เครื่องพิมพ์ที่รองรับ ESC/POS')

      // Get write characteristic - try multiple UUIDs for different printer types
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null
      for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
        try {
          characteristic = await service.getCharacteristic(charUuid)
          if (characteristic) {
            console.log('Found characteristic:', charUuid)
            break
          }
        } catch {
          // Try next UUID
        }
      }

      // If no known characteristic found, try to find any writable characteristic
      if (!characteristic) {
        try {
          const characteristics = await service.getCharacteristics()
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char
              console.log('Found writable characteristic:', char.uuid)
              break
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!characteristic) throw new Error('ไม่พบช่องทางสื่อสารกับเครื่องพิมพ์ - กรุณาลองเชื่อมต่อใหม่')

      this.characteristic = characteristic

      // Save device info (AC-1.4)
      this.settings.deviceId = this.device.id
      this.settings.deviceName = this.device.name || 'Unknown Printer'
      this.settings.isConnected = true
      this.saveSettings()

      // Listen for disconnect - use the handleDisconnect method for proper cleanup
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect)

      return true
    } catch (error) {
      console.error('Bluetooth connection error:', error)
      throw error
    }
  }

  /**
   * Reconnect to previously paired device
   * AC-1.4: เชื่อมต่อใหม่กับเครื่องที่เคยจับคู่
   * 
   * Error handling:
   * - Returns false if no device ID saved or Web Bluetooth not supported
   * - Returns false if device not found in paired devices list
   * - Returns false if connection fails (device out of range, powered off, etc.)
   */
  async reconnect(): Promise<boolean> {
    if (!this.settings.deviceId) return false
    if (!BluetoothPrinter.isSupported()) return false

    try {
      // Get previously paired devices
      const devices = await navigator.bluetooth.getDevices()
      const device = devices.find(d => d.id === this.settings.deviceId)

      // Device not found in paired devices list
      if (!device) {
        console.log('Reconnect: Device not found in paired devices list')
        return false
      }

      this.device = device
      const server = await device.gatt?.connect()
      
      // Failed to connect to GATT server (device may be out of range or powered off)
      if (!server) {
        console.log('Reconnect: Failed to connect to GATT server')
        return false
      }

      // Try to get service
      let service: BluetoothRemoteGATTService | null = null
      for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(uuid)
          if (service) break
        } catch {
          // Try next UUID
        }
      }

      if (!service) {
        console.log('Reconnect: No compatible printer service found')
        return false
      }

      // Get write characteristic - try multiple UUIDs
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null
      for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
        try {
          characteristic = await service.getCharacteristic(charUuid)
          if (characteristic) break
        } catch {
          // Try next UUID
        }
      }

      // If no known characteristic found, try to find any writable characteristic
      if (!characteristic) {
        try {
          const characteristics = await service.getCharacteristics()
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char
              break
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!characteristic) {
        console.log('Reconnect: No writable characteristic found')
        return false
      }

      this.characteristic = characteristic
      this.settings.isConnected = true
      this.saveSettings()

      // Listen for disconnect - use the handleDisconnect method for proper cleanup
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect)

      return true
    } catch (error) {
      console.log('Reconnect error:', error)
      return false
    }
  }

  /**
   * Disconnect from printer
   * AC-1.6: ยกเลิกการเชื่อมต่อ
   */
  disconnect(): void {
    // Remove disconnect listener before manual disconnect to avoid double handling
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect)
    }
    
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.characteristic = null
    this.settings.isConnected = false
    this.saveSettings()
  }

  /**
   * Check if currently connected
   * AC-1.5: ตรวจสอบสถานะการเชื่อมต่อ
   */
  isConnected(): boolean {
    return this.settings.isConnected && this.device?.gatt?.connected === true
  }

  /**
   * Send raw bytes to printer
   * Supports both write and writeWithoutResponse for different printer types
   * 
   * Error handling (user-friendly Thai messages):
   * - "ไม่ได้เชื่อมต่อเครื่องพิมพ์" - Not connected
   * - "การเชื่อมต่อขาดหาย" - Connection lost during write
   * - "เครื่องพิมพ์ไม่ว่าง" - Device busy / buffer full
   * - "หมดเวลาการส่งข้อมูล" - Timeout
   * - "ไม่มีสิทธิ์เข้าถึงเครื่องพิมพ์" - Permission denied
   * - "ส่งข้อมูลไม่สำเร็จ" - Generic write failure
   * 
   * Retries transient failures up to MAX_WRITE_RETRIES times
   */
  async write(data: number[]): Promise<void> {
    const MAX_WRITE_RETRIES = 3
    const RETRY_DELAY_MS = 100

    if (!this.characteristic) {
      throw new Error('ไม่ได้เชื่อมต่อเครื่องพิมพ์ - กรุณาเชื่อมต่อก่อนพิมพ์')
    }

    // Check if GATT server is still connected before writing
    if (!this.device?.gatt?.connected) {
      this.settings.isConnected = false
      this.saveSettings()
      throw new Error('การเชื่อมต่อขาดหาย - กรุณาเชื่อมต่อใหม่')
    }

    const bytes = new Uint8Array(data)

    // Send in chunks (max 512 bytes per write, some printers need smaller chunks)
    const chunkSize = this.characteristic.properties.writeWithoutResponse ? 20 : 512
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize)
      
      let lastError: Error | null = null
      let writeSuccess = false

      // Retry loop for transient write failures
      for (let attempt = 1; attempt <= MAX_WRITE_RETRIES; attempt++) {
        try {
          // Check connection before each chunk write
          if (!this.device?.gatt?.connected) {
            this.settings.isConnected = false
            this.saveSettings()
            throw new Error('การเชื่อมต่อขาดหายระหว่างพิมพ์ - กรุณาเชื่อมต่อใหม่แล้วลองอีกครั้ง')
          }

          // Use writeWithoutResponse if available (faster for some printers like Inner Printer)
          if (this.characteristic.properties.writeWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(chunk)
          } else {
            await this.characteristic.writeValue(chunk)
          }
          
          writeSuccess = true
          break // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          const message = lastError.message.toLowerCase()
          
          // Handle connection lost during write - don't retry
          if (message.includes('disconnected') || 
              message.includes('connection') || 
              message.includes('gatt') ||
              message.includes('not connected')) {
            this.settings.isConnected = false
            this.saveSettings()
            throw new Error('การเชื่อมต่อขาดหาย - กรุณาเชื่อมต่อใหม่')
          }

          // Handle device busy / buffer full - retry after delay
          if (message.includes('busy') || 
              message.includes('buffer') ||
              message.includes('in progress') ||
              message.includes('pending')) {
            console.log(`Write attempt ${attempt}/${MAX_WRITE_RETRIES} failed (device busy), retrying...`)
            if (attempt < MAX_WRITE_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
              continue
            }
          }

          // Handle network/transmission errors - retry
          if (message.includes('network') ||
              message.includes('transmission') ||
              message.includes('failed')) {
            console.log(`Write attempt ${attempt}/${MAX_WRITE_RETRIES} failed (transmission error), retrying...`)
            if (attempt < MAX_WRITE_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
              continue
            }
          }

          // Unknown error on last attempt - throw
          if (attempt === MAX_WRITE_RETRIES) {
            break
          }

          // Retry for other transient errors
          console.log(`Write attempt ${attempt}/${MAX_WRITE_RETRIES} failed, retrying...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
        }
      }

      // If all retries failed, throw appropriate error with user-friendly message
      if (!writeSuccess) {
        const errorMessage = lastError?.message.toLowerCase() || ''
        
        // Provide specific error messages based on failure type
        if (errorMessage.includes('busy') || errorMessage.includes('buffer')) {
          throw new Error('เครื่องพิมพ์ไม่ว่าง - กรุณารอสักครู่แล้วลองใหม่')
        }
        if (errorMessage.includes('timeout')) {
          throw new Error('หมดเวลาการส่งข้อมูล - กรุณาตรวจสอบเครื่องพิมพ์แล้วลองใหม่')
        }
        if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
          throw new Error('ไม่มีสิทธิ์เข้าถึงเครื่องพิมพ์ - กรุณาเชื่อมต่อใหม่')
        }
        
        // Generic write failed error
        throw new Error('ส่งข้อมูลไม่สำเร็จ - กรุณาลองใหม่อีกครั้ง')
      }
      
      // Small delay between chunks (longer for writeWithoutResponse)
      await new Promise(resolve => setTimeout(resolve, chunkSize === 20 ? 30 : 50))
    }
  }

  /**
   * Print text with Thai TIS-620 encoding
   * Thai characters are encoded using TIS-620 standard
   * ASCII characters are passed through unchanged
   */
  private async printText(text: string): Promise<void> {
    const bytes = encodeThaiText(text)
    await this.write(bytes)
  }

  /**
   * Print text with UTF-8 encoding (for printers that support UTF-8)
   * Use this if your printer has native UTF-8 support
   */
  private async printTextUTF8(text: string): Promise<void> {
    const encoder = new TextEncoder()
    const bytes = Array.from(encoder.encode(text))
    await this.write(bytes)
  }

  // ===== Text Alignment Commands (REQ-4) =====

  /**
   * Set text alignment to left
   * ESC a 0
   */
  async alignLeft(): Promise<void> {
    await this.write(Commands.ALIGN_LEFT)
  }

  /**
   * Set text alignment to center
   * ESC a 1
   */
  async alignCenter(): Promise<void> {
    await this.write(Commands.ALIGN_CENTER)
  }

  /**
   * Set text alignment to right
   * ESC a 2
   */
  async alignRight(): Promise<void> {
    await this.write(Commands.ALIGN_RIGHT)
  }

  /**
   * Set text alignment by name
   * @param alignment - 'left' | 'center' | 'right'
   */
  async setAlignment(alignment: TextAlignment): Promise<void> {
    switch (alignment) {
      case 'left':
        await this.alignLeft()
        break
      case 'center':
        await this.alignCenter()
        break
      case 'right':
        await this.alignRight()
        break
    }
  }

  // ===== Text Style Commands (REQ-4) =====

  /**
   * Enable bold text
   * ESC E 1
   */
  async boldOn(): Promise<void> {
    await this.write(Commands.BOLD_ON)
  }

  /**
   * Disable bold text
   * ESC E 0
   */
  async boldOff(): Promise<void> {
    await this.write(Commands.BOLD_OFF)
  }

  /**
   * Set bold state
   * @param enabled - true to enable bold, false to disable
   */
  async setBold(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.boldOn()
    } else {
      await this.boldOff()
    }
  }

  /**
   * Set text size to normal
   * GS ! 0
   */
  async sizeNormal(): Promise<void> {
    await this.write(Commands.SIZE_NORMAL)
  }

  /**
   * Set text size to double height
   * GS ! 1
   */
  async sizeDoubleHeight(): Promise<void> {
    await this.write(Commands.SIZE_DOUBLE_HEIGHT)
  }

  /**
   * Set text size to double width
   * GS ! 16
   */
  async sizeDoubleWidth(): Promise<void> {
    await this.write(Commands.SIZE_DOUBLE_WIDTH)
  }

  /**
   * Set text size to double (both height and width)
   * GS ! 17
   */
  async sizeDouble(): Promise<void> {
    await this.write(Commands.SIZE_DOUBLE)
  }

  /**
   * Set text size by name
   * @param size - 'normal' | 'double-height' | 'double-width' | 'double'
   */
  async setSize(size: TextSize): Promise<void> {
    switch (size) {
      case 'normal':
        await this.sizeNormal()
        break
      case 'double-height':
        await this.sizeDoubleHeight()
        break
      case 'double-width':
        await this.sizeDoubleWidth()
        break
      case 'double':
        await this.sizeDouble()
        break
    }
  }

  // ===== Paper Cut Commands (REQ-4) =====

  /**
   * Partial cut paper (leaves a small connection)
   * GS V 1
   * Most thermal printers support this for easy tear-off
   */
  async cutPartial(): Promise<void> {
    await this.write(Commands.CUT_PARTIAL)
  }

  /**
   * Full cut paper (complete cut)
   * GS V 0
   * Note: Not all printers support full cut
   */
  async cutFull(): Promise<void> {
    await this.write(Commands.CUT_FULL)
  }

  /**
   * Cut paper with specified type
   * @param type - 'partial' | 'full'
   */
  async cut(type: 'partial' | 'full' = 'partial'): Promise<void> {
    if (type === 'full') {
      await this.cutFull()
    } else {
      await this.cutPartial()
    }
  }

  /**
   * Feed paper and then cut
   * @param lines - Number of lines to feed before cutting (default: 3)
   * @param cutType - 'partial' | 'full' (default: 'partial')
   */
  async feedAndCut(lines: number = 3, cutType: 'partial' | 'full' = 'partial'): Promise<void> {
    await this.write(Commands.FEED_LINES(lines))
    await this.cut(cutType)
  }

  /**
   * Format a line with label on left and value on right
   */
  private formatLine(label: string, value: string, width: number): string {
    const spaces = width - label.length - value.length
    return label + ' '.repeat(Math.max(1, spaces)) + value
  }

  /**
   * Get line width based on paper size
   * @returns Number of characters per line (32 for 58mm, 48 for 80mm)
   */
  getLineWidth(): number {
    return this.settings.paperWidth === 58 ? 32 : 48
  }

  /**
   * Format receipt header (store name, address, phone)
   * AC-4.1: แสดงชื่อร้าน (ตัวใหญ่ ตรงกลาง)
   * AC-4.2: แสดงที่อยู่และเบอร์โทร (ถ้ามี)
   * 
   * @param storeName - Store name to display (centered, bold, large)
   * @param storeAddress - Store address (optional, centered)
   * @param storePhone - Store phone number (optional, centered with "โทร:" prefix)
   * @param lineWidth - Number of characters per line
   * @returns Formatted header as ESC/POS command bytes
   */
  formatHeader(
    storeName: string,
    storeAddress?: string,
    storePhone?: string,
    lineWidth?: number
  ): number[] {
    const width = lineWidth ?? this.getLineWidth()
    const bytes: number[] = []

    // Store name (centered, bold, large) - AC-4.1
    bytes.push(...Commands.ALIGN_CENTER)
    bytes.push(...Commands.SIZE_DOUBLE)
    bytes.push(...Commands.BOLD_ON)
    bytes.push(...encodeThaiText(storeName + '\n'))
    bytes.push(...Commands.SIZE_NORMAL)
    bytes.push(...Commands.BOLD_OFF)

    // Store address - AC-4.2
    if (storeAddress && storeAddress.trim()) {
      bytes.push(...encodeThaiText(storeAddress + '\n'))
    }

    // Store phone - AC-4.2
    if (storePhone && storePhone.trim()) {
      bytes.push(...encodeThaiText('โทร: ' + storePhone + '\n'))
    }

    // Separator line
    bytes.push(...encodeThaiText('='.repeat(width) + '\n'))

    return bytes
  }

  /**
   * Print receipt header directly to printer
   * Convenience method that formats and prints the header
   * 
   * @param storeName - Store name (optional, uses settings if not provided)
   * @param storeAddress - Store address (optional, uses settings if not provided)
   * @param storePhone - Store phone (optional, uses settings if not provided)
   */
  async printHeader(
    storeName?: string,
    storeAddress?: string,
    storePhone?: string
  ): Promise<void> {
    const name = storeName ?? this.settings.storeName
    const address = storeAddress ?? this.settings.storeAddress
    const phone = storePhone ?? this.settings.storePhone

    const headerBytes = this.formatHeader(name, address, phone)
    await this.write(headerBytes)
  }

  /**
   * Format receipt items list
   * AC-4.5: แสดงรายการสินค้า (ชื่อ, จำนวน, ราคา, รวม)
   * 
   * Each item is formatted as:
   * Line 1: Item name (truncated if too long)
   * Line 2: Quantity @ unit price = subtotal (right-aligned)
   * Line 3 (optional): Note in parentheses (e.g., "แลกถัง", "มัดจำ 200฿")
   * 
   * @param items - Array of receipt items to format
   * @param lineWidth - Number of characters per line (default: based on paper width)
   * @returns Formatted items as ESC/POS command bytes
   */
  formatItems(items: ReceiptItem[], lineWidth?: number): number[] {
    const width = lineWidth ?? this.getLineWidth()
    const bytes: number[] = []

    // Set left alignment for items
    bytes.push(...Commands.ALIGN_LEFT)

    for (const item of items) {
      // Calculate max name length (leave room for price info on second line)
      const maxNameLength = width - 2  // Leave some margin
      
      // Truncate name if too long
      const displayName = item.name.length > maxNameLength 
        ? item.name.substring(0, maxNameLength - 2) + '..'
        : item.name

      // Line 1: Item name
      bytes.push(...encodeThaiText(displayName + '\n'))

      // Line 2: Quantity @ unit price = subtotal (right-aligned)
      // Format: "  x2 @ 50 = 100"
      const qtyStr = `x${item.quantity}`
      const priceStr = item.price.toLocaleString()
      const subtotalStr = item.subtotal.toLocaleString()
      const priceLine = `  ${qtyStr} @ ${priceStr} = ${subtotalStr}`
      
      // Right-align the price line by padding with spaces
      const paddedPriceLine = priceLine.padStart(width)
      bytes.push(...encodeThaiText(paddedPriceLine + '\n'))

      // Line 3 (optional): Note
      if (item.note && item.note.trim()) {
        bytes.push(...encodeThaiText(`  (${item.note})\n`))
      }
    }

    return bytes
  }

  /**
   * Print items list directly to printer
   * Convenience method that formats and prints items
   * 
   * @param items - Array of receipt items to print
   */
  async printItems(items: ReceiptItem[]): Promise<void> {
    const itemsBytes = this.formatItems(items)
    await this.write(itemsBytes)
  }

  /**
   * Format receipt totals section
   * AC-4.6: แสดงส่วนลด (ถ้ามี)
   * AC-4.7: แสดงยอดรวม, รับเงิน, ทอน
   * AC-4.8: แสดงวิธีชำระเงิน
   * 
   * Formats the totals section including:
   * - Discount (if any)
   * - Grand total (bold)
   * - Payment method
   * - Amount received and change (for cash payments)
   * 
   * @param totals - Totals data object containing discount, total, payment, change, paymentMethod
   * @param lineWidth - Number of characters per line (default: based on paper width)
   * @returns Formatted totals as ESC/POS command bytes
   */
  formatTotals(totals: TotalsData, lineWidth?: number): number[] {
    const width = lineWidth ?? this.getLineWidth()
    const bytes: number[] = []

    // Payment method text mapping
    const paymentMethodText: Record<string, string> = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit: 'วางบิล'
    }

    // Discount - AC-4.6
    if (totals.discount > 0) {
      const discountLine = this.formatLine('ส่วนลด', `-${totals.discount.toLocaleString()}`, width)
      bytes.push(...encodeThaiText(discountLine + '\n'))
    }

    // Grand total (bold) - AC-4.7
    bytes.push(...Commands.BOLD_ON)
    const totalLine = this.formatLine('รวมทั้งสิ้น', totals.total.toLocaleString() + ' บาท', width)
    bytes.push(...encodeThaiText(totalLine + '\n'))
    bytes.push(...Commands.BOLD_OFF)

    // Payment method - AC-4.8
    const paymentMethodLine = this.formatLine('ชำระโดย', paymentMethodText[totals.paymentMethod], width)
    bytes.push(...encodeThaiText(paymentMethodLine + '\n'))

    // Cash payment details (received and change) - AC-4.7
    if (totals.paymentMethod === 'cash') {
      const receivedLine = this.formatLine('รับเงิน', totals.payment.toLocaleString() + ' บาท', width)
      bytes.push(...encodeThaiText(receivedLine + '\n'))
      
      const changeLine = this.formatLine('เงินทอน', totals.change.toLocaleString() + ' บาท', width)
      bytes.push(...encodeThaiText(changeLine + '\n'))
    }

    return bytes
  }

  /**
   * Print totals section directly to printer
   * Convenience method that formats and prints totals
   * 
   * @param totals - Totals data object
   */
  async printTotals(totals: TotalsData): Promise<void> {
    const totalsBytes = this.formatTotals(totals)
    await this.write(totalsBytes)
  }

  /**
   * Format receipt footer
   * AC-4.10: แสดงข้อความท้ายใบเสร็จ
   * 
   * Formats the footer section including:
   * - Separator line (=)
   * - Footer text (centered, e.g., "ขอบคุณที่ใช้บริการ")
   * - Paper feed for easy tear-off
   * 
   * @param footerText - Footer message to display (centered)
   * @param lineWidth - Number of characters per line (default: based on paper width)
   * @param feedLines - Number of lines to feed after footer (default: 4)
   * @returns Formatted footer as ESC/POS command bytes
   */
  formatFooter(footerText: string, lineWidth?: number, feedLines: number = 4): number[] {
    const width = lineWidth ?? this.getLineWidth()
    const bytes: number[] = []

    // Separator line
    bytes.push(...encodeThaiText('='.repeat(width) + '\n'))

    // Footer text (centered) - AC-4.10
    bytes.push(...Commands.ALIGN_CENTER)
    bytes.push(...encodeThaiText(footerText + '\n'))

    // Feed lines for easy tear-off
    bytes.push(...Commands.FEED_LINES(feedLines))

    return bytes
  }

  /**
   * Print footer directly to printer
   * Convenience method that formats and prints footer
   * 
   * @param footerText - Footer message (optional, uses settings if not provided)
   * @param feedLines - Number of lines to feed after footer (default: 4)
   * @param cutPaper - Whether to cut paper after footer (default: true)
   * @param cutType - Type of paper cut: 'partial' | 'full' (default: 'partial')
   */
  async printFooter(
    footerText?: string,
    feedLines: number = 4,
    cutPaper: boolean = true,
    cutType: CutType = 'partial'
  ): Promise<void> {
    const text = footerText ?? this.settings.footerText
    const footerBytes = this.formatFooter(text, undefined, feedLines)
    await this.write(footerBytes)

    // Cut paper if requested
    if (cutPaper) {
      await this.cut(cutType)
    }
  }

  /**
   * Print a complete receipt
   * REQ-4: รูปแบบใบเสร็จ
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    const { paperWidth, storeName, storeAddress, storePhone, footerText } = this.settings
    const lineWidth = paperWidth === 58 ? 32 : 48

    // Initialize printer
    await this.write(Commands.INIT)
    await this.write(Commands.THAI_ENCODING)

    // Print header (store name, address, phone) - AC-4.1, AC-4.2
    await this.printHeader(storeName, storeAddress, storePhone)

    // Receipt info (left aligned) - AC-4.3, AC-4.4
    await this.write(Commands.ALIGN_LEFT)
    await this.printText(`เลขที่: ${data.receiptNo}\n`)
    await this.printText(`วันที่: ${data.date} ${data.time}\n`)
    await this.printText(`พนักงาน: ${data.staffName}\n`)  // AC-4.11

    // Customer name - AC-4.9
    if (data.customerName) {
      await this.printText(`ลูกค้า: ${data.customerName}\n`)
    }

    // Separator
    await this.printText('-'.repeat(lineWidth) + '\n')

    // Items - AC-4.5 (using formatItems method)
    await this.printItems(data.items)

    // Separator
    await this.printText('-'.repeat(lineWidth) + '\n')

    // Totals section - AC-4.6, AC-4.7, AC-4.8 (using formatTotals method)
    await this.printTotals({
      discount: data.discount,
      total: data.total,
      payment: data.payment,
      change: data.change,
      paymentMethod: data.paymentMethod
    })

    // Points - AC-4.9
    if (data.pointsEarned || data.pointsUsed) {
      await this.printText('-'.repeat(lineWidth) + '\n')
      if (data.pointsUsed) {
        await this.printText(this.formatLine('ใช้แต้ม', `-${data.pointsUsed}`, lineWidth) + '\n')
      }
      if (data.pointsEarned) {
        await this.printText(this.formatLine('แต้มที่ได้', `+${data.pointsEarned}`, lineWidth) + '\n')
      }
      if (data.totalPoints !== undefined) {
        await this.printText(this.formatLine('แต้มสะสม', data.totalPoints.toString(), lineWidth) + '\n')
      }
    }

    // Footer - AC-4.10 (using printFooter method)
    await this.printFooter(footerText, 4, true, 'partial')
  }

  /**
   * Set Thai encoding mode (TIS-620)
   * Call this before printing Thai text
   */
  async setThaiEncoding(): Promise<void> {
    await this.write(Commands.THAI_ENCODING)
  }

  /**
   * Set Thai encoding mode (Windows CP874)
   * Alternative encoding for some printer models
   */
  async setThaiEncodingCP874(): Promise<void> {
    await this.write(Commands.THAI_CP874)
  }

  /**
   * Test print with Thai text
   * Tests both Thai and ASCII character printing
   */
  async testPrint(): Promise<void> {
    await this.write(Commands.INIT)
    await this.write(Commands.THAI_ENCODING)  // Enable Thai encoding
    await this.write(Commands.ALIGN_CENTER)
    await this.write(Commands.SIZE_DOUBLE)
    await this.printText('ทดสอบเครื่องพิมพ์\n')
    await this.write(Commands.SIZE_NORMAL)
    await this.printText('Test Print OK\n')
    await this.printText('ภาษาไทย: กขคงจ\n')
    await this.printText('ตัวเลข: ๐๑๒๓๔๕๖๗๘๙\n')
    await this.printText('สัญลักษณ์: ฿100.00\n')
    await this.printText(new Date().toLocaleString('th-TH') + '\n')
    await this.write(Commands.FEED_LINES(3))
    await this.write(Commands.CUT_PARTIAL)
  }

  // ===== Settings Management (REQ-2) =====

  /**
   * Load settings from localStorage
   * AC-2.1 - AC-2.6
   */
  private loadSettings(): PrinterSettings {
    if (typeof localStorage === 'undefined') {
      return { ...defaultPrinterSettings }
    }
    const saved = localStorage.getItem('printerSettings')
    return saved ? { ...defaultPrinterSettings, ...JSON.parse(saved) } : { ...defaultPrinterSettings }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('printerSettings', JSON.stringify(this.settings))
    }
  }

  /**
   * Get current settings
   */
  getSettings(): PrinterSettings {
    return { ...this.settings }
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<PrinterSettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
  }

  /**
   * Get device name
   */
  getDeviceName(): string | null {
    return this.settings.deviceName
  }
}

// Export singleton instance
export const printer = new BluetoothPrinter()
export { BluetoothPrinter }

// ===== Sale to ReceiptData Conversion Utility =====

import type { Sale } from '../types'

/**
 * Convert Sale object to ReceiptData format for Bluetooth printing
 * AC-3.3: พิมพ์ซ้ำจากประวัติการขาย
 * 
 * This utility function transforms a Sale object (from the database/store)
 * into the ReceiptData format required by the Bluetooth printer.
 * 
 * @param sale - The Sale object to convert
 * @param staffName - Optional staff name (defaults to 'พนักงาน')
 * @returns ReceiptData object ready for printing
 */
export function saleToReceiptData(sale: Sale, staffName: string = 'พนักงาน'): ReceiptData {
  const saleDate = new Date(sale.created_at)
  
  // Calculate total deposit for gas items (deposit type sales)
  const totalDeposit = sale.items.reduce((sum, item) => {
    if (item.gas_sale_type === 'deposit' && item.deposit_amount) {
      return sum + (item.deposit_amount * item.quantity)
    }
    return sum
  }, 0)

  return {
    // Header info - AC-4.3, AC-4.4
    receiptNo: sale.id.slice(-6),
    date: saleDate.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }),
    time: saleDate.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    
    // Items - AC-4.5
    items: sale.items.map(item => {
      // Determine note based on gas sale type
      let note: string | undefined
      if (item.gas_sale_type === 'exchange') {
        note = 'แลกถัง'
      } else if (item.gas_sale_type === 'deposit') {
        note = `มัดจำ +฿${item.deposit_amount || 0}`
      } else if (item.gas_sale_type === 'outright') {
        note = 'ซื้อขาด'
      }
      
      return {
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        note,
      }
    }),
    
    // Totals - AC-4.6, AC-4.7
    subtotal: sale.total + (sale.discount_amount || 0) + (sale.points_used || 0),
    discount: (sale.discount_amount || 0) + (sale.points_used || 0),
    total: sale.total + totalDeposit,
    payment: sale.payment,
    change: sale.change,
    
    // Payment method - AC-4.8
    paymentMethod: sale.payment_method || 'cash',
    
    // Customer info - AC-4.9
    customerName: sale.customer_name || undefined,
    pointsEarned: sale.points_earned,
    pointsUsed: sale.points_used,
    
    // Staff - AC-4.11
    staffName,
  }
}
