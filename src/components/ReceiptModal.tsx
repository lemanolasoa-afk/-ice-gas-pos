import { useRef, useState, useEffect } from 'react'
import { X, Printer, Download, Store, RefreshCw, Banknote, Star, User, Share2, Image, FileText, Bluetooth, AlertCircle } from 'lucide-react'
import { Sale } from '../types'
import { usePrinter } from '../hooks/usePrinter'
import { saleToReceiptData } from '../lib/bluetoothPrinter'
import { useToast } from './Toast'

interface Props {
  sale: Sale
  onClose: () => void
}

export function ReceiptModal({ sale, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [bluetoothPrintError, setBluetoothPrintError] = useState<string | null>(null)
  
  // Bluetooth printer hook - AC-3.2
  const { isConnected, isPrinting, print, error: printerError } = usePrinter()
  
  // Toast for success/error feedback
  const { showToast } = useToast()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateShort = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate total deposit for gas items
  const totalDeposit = sale.items.reduce((sum, item) => {
    if (item.gas_sale_type === 'deposit' && item.deposit_amount) {
      return sum + (item.deposit_amount * item.quantity)
    }
    return sum
  }, 0)

  // Generate thermal printer optimized HTML
  const generateThermalReceiptHTML = () => {
    const itemsHTML = sale.items.map(item => {
      let gasInfo = ''
      if (item.gas_sale_type === 'exchange') {
        gasInfo = '<div class="gas-type">(แลกถัง)</div>'
      } else if (item.gas_sale_type === 'deposit') {
        gasInfo = `<div class="gas-type">(มัดจำ +฿${item.deposit_amount || 0})</div>`
      } else if (item.gas_sale_type === 'outright') {
        gasInfo = '<div class="gas-type">(ซื้อขาด)</div>'
      }
      return `
        <div class="item">
          <div class="item-name">${item.product_name}</div>
          <div class="item-detail">
            <span>${item.quantity} x ฿${item.price}</span>
            <span class="item-subtotal">฿${item.subtotal}</span>
          </div>
          ${gasInfo}
        </div>
      `
    }).join('')

    const depositSection = totalDeposit > 0 ? `
      <div class="summary-row">
        <span>ค่ามัดจำถัง</span>
        <span>+฿${totalDeposit}</span>
      </div>
    ` : ''

    const discountSection = sale.discount_amount && sale.discount_amount > 0 ? `
      <div class="summary-row discount">
        <span>${sale.discount_name ? `ส่วนลด (${sale.discount_name})` : 'ส่วนลด'}</span>
        <span>-฿${sale.discount_amount}</span>
      </div>
    ` : ''

    const pointsUsedSection = sale.points_used && sale.points_used > 0 ? `
      <div class="summary-row points">
        <span>ใช้แต้ม (${sale.points_used} แต้ม)</span>
        <span>-฿${sale.points_used}</span>
      </div>
    ` : ''

    const customerSection = sale.customer_name ? `
      <div class="divider"></div>
      <div class="customer-section">
        <div class="customer-name">ลูกค้า: ${sale.customer_name}</div>
        ${sale.points_earned && sale.points_earned > 0 ? `<div class="points-earned">ได้รับ +${sale.points_earned} แต้ม</div>` : ''}
      </div>
    ` : ''

    const paymentMethodText = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit: 'วางบิล'
    }[sale.payment_method || 'cash']

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ใบเสร็จ #${sale.id.slice(-6)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Sarabun', 'Tahoma', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            max-width: 80mm;
            padding: 8px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 12px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .receipt-no {
            font-size: 11px;
            color: #666;
          }
          .datetime {
            font-size: 10px;
            color: #888;
          }
          .divider {
            border-top: 1px dashed #ccc;
            margin: 8px 0;
          }
          .divider-double {
            border-top: 2px solid #333;
            margin: 8px 0;
          }
          .item {
            margin-bottom: 6px;
          }
          .item-name {
            font-weight: 500;
          }
          .item-detail {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #555;
          }
          .item-subtotal {
            font-weight: 500;
          }
          .gas-type {
            font-size: 10px;
            color: #666;
            font-style: italic;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin: 2px 0;
          }
          .summary-row.discount {
            color: #16a34a;
          }
          .summary-row.points {
            color: #ca8a04;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: bold;
            margin: 8px 0;
            padding: 4px 0;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 2px 0;
          }
          .payment-method {
            font-size: 10px;
            color: #666;
            text-align: right;
            margin-top: 4px;
          }
          .customer-section {
            background: #f5f5f5;
            padding: 6px;
            border-radius: 4px;
            font-size: 11px;
          }
          .customer-name {
            font-weight: 500;
          }
          .points-earned {
            color: #16a34a;
            font-size: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 11px;
            color: #666;
          }
          .footer-thanks {
            font-size: 12px;
            margin-bottom: 4px;
          }
          @media print {
            body {
              padding: 0;
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">🏪 ร้านน้ำแข็ง แก๊ส น้ำดื่ม</div>
          <div class="receipt-no">ใบเสร็จ #${sale.id.slice(-6)}</div>
          <div class="datetime">${formatDateShort(sale.created_at)}</div>
        </div>
        
        <div class="divider-double"></div>
        
        <div class="items">
          ${itemsHTML}
        </div>
        
        <div class="divider"></div>
        
        ${depositSection}
        ${discountSection}
        ${pointsUsedSection}
        
        <div class="total-row">
          <span>รวมทั้งสิ้น</span>
          <span>฿${(sale.total + totalDeposit).toLocaleString()}</span>
        </div>
        
        <div class="payment-row">
          <span>รับเงิน</span>
          <span>฿${sale.payment.toLocaleString()}</span>
        </div>
        <div class="payment-row">
          <span>ทอน</span>
          <span>฿${sale.change.toLocaleString()}</span>
        </div>
        <div class="payment-method">ชำระโดย: ${paymentMethodText}</div>
        
        ${customerSection}
        
        <div class="divider"></div>
        
        <div class="footer">
          <div class="footer-thanks">ขอบคุณที่ใช้บริการ</div>
          <div>Thank you for your purchase</div>
        </div>
      </body>
      </html>
    `
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เปิด popup เพื่อพิมพ์ใบเสร็จ')
      return
    }

    printWindow.document.write(generateThermalReceiptHTML())
    printWindow.document.close()
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }
  }

  const handleDownloadText = () => {
    const customerSection = sale.customer_name 
      ? `\nลูกค้า: ${sale.customer_name}${sale.points_used ? `\nใช้แต้ม: ${sale.points_used} แต้ม (-฿${sale.points_used})` : ''}${sale.points_earned ? `\nได้รับแต้ม: +${sale.points_earned} แต้ม` : ''}\n`
      : ''

    const paymentMethodText = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit: 'วางบิล'
    }[sale.payment_method || 'cash']

    const receiptText = `
ร้านน้ำแข็ง แก๊ส น้ำดื่ม
================================
ใบเสร็จ #${sale.id.slice(-6)}
${formatDate(sale.created_at)}
================================
${sale.items.map((item) => {
  let line = `${item.product_name} x${item.quantity}  ฿${item.subtotal}`
  if (item.gas_sale_type === 'exchange') {
    line += ' (แลกถัง)'
  } else if (item.gas_sale_type === 'deposit') {
    line += ` (มัดจำ +฿${item.deposit_amount || 0})`
  } else if (item.gas_sale_type === 'outright') {
    line += ' (ซื้อขาด)'
  }
  return line
}).join('\n')}
================================
${totalDeposit > 0 ? `ค่ามัดจำ: ฿${totalDeposit}\n` : ''}${sale.discount_amount ? `ส่วนลด${sale.discount_name ? ` (${sale.discount_name})` : ''}: -฿${sale.discount_amount}\n` : ''}${sale.points_used ? `ใช้แต้ม: -฿${sale.points_used}\n` : ''}รวม: ฿${sale.total}${totalDeposit > 0 ? ` + ฿${totalDeposit} = ฿${sale.total + totalDeposit}` : ''}
รับเงิน: ฿${sale.payment}
ทอน: ฿${sale.change}
ชำระโดย: ${paymentMethodText}${customerSection}
================================
ขอบคุณที่ใช้บริการ
    `.trim()

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${sale.id.slice(-6)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Share as image using canvas
  const handleShareImage = async () => {
    setIsGenerating(true)
    try {
      // Create a temporary container for rendering
      const container = document.createElement('div')
      container.innerHTML = generateThermalReceiptHTML()
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      document.body.appendChild(container)

      // Use html2canvas if available, otherwise fallback to screenshot API
      if ('html2canvas' in window) {
        // @ts-ignore
        const canvas = await window.html2canvas(container.querySelector('body'))
        const dataUrl = canvas.toDataURL('image/png')
        
        // Try native share if available
        if (navigator.share && navigator.canShare) {
          const blob = await (await fetch(dataUrl)).blob()
          const file = new File([blob], `receipt-${sale.id.slice(-6)}.png`, { type: 'image/png' })
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `ใบเสร็จ #${sale.id.slice(-6)}`,
            })
          } else {
            // Fallback to download
            downloadDataUrl(dataUrl, `receipt-${sale.id.slice(-6)}.png`)
          }
        } else {
          downloadDataUrl(dataUrl, `receipt-${sale.id.slice(-6)}.png`)
        }
      } else {
        // Fallback: share text or download HTML
        if (navigator.share) {
          await navigator.share({
            title: `ใบเสร็จ #${sale.id.slice(-6)}`,
            text: generateReceiptText(),
          })
        } else {
          alert('ไม่สามารถแชร์รูปภาพได้ กรุณาใช้ปุ่มดาวน์โหลดแทน')
        }
      }
      
      document.body.removeChild(container)
    } catch (error) {
      console.error('Share error:', error)
      // Fallback to text share
      if (navigator.share) {
        try {
          await navigator.share({
            title: `ใบเสร็จ #${sale.id.slice(-6)}`,
            text: generateReceiptText(),
          })
        } catch {
          // User cancelled or error
        }
      }
    } finally {
      setIsGenerating(false)
      setShowShareMenu(false)
    }
  }

  const generateReceiptText = () => {
    const paymentMethodText = {
      cash: 'เงินสด',
      transfer: 'โอนเงิน',
      credit: 'วางบิล'
    }[sale.payment_method || 'cash']

    return `🧾 ใบเสร็จ #${sale.id.slice(-6)}
📅 ${formatDateShort(sale.created_at)}
━━━━━━━━━━━━━━━━
${sale.items.map(item => `• ${item.product_name} x${item.quantity} = ฿${item.subtotal}`).join('\n')}
━━━━━━━━━━━━━━━━
💰 รวม: ฿${(sale.total + totalDeposit).toLocaleString()}
💵 รับ: ฿${sale.payment.toLocaleString()}
💸 ทอน: ฿${sale.change.toLocaleString()}
📝 ชำระ: ${paymentMethodText}
━━━━━━━━━━━━━━━━
ขอบคุณที่ใช้บริการ 🙏`
  }

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  /**
   * Handle Bluetooth thermal printer printing
   * AC-3.2: มีปุ่มพิมพ์ใบเสร็จใน ReceiptModal
   * AC-3.4: แสดง loading ขณะพิมพ์
   * AC-3.5: แสดง error ถ้าพิมพ์ไม่สำเร็จ พร้อมปุ่มลองใหม่
   */
  const handleBluetoothPrint = async () => {
    // Clear previous error before attempting print
    setBluetoothPrintError(null)
    
    try {
      const receiptData = saleToReceiptData(sale)
      const success = await print(receiptData)
      
      if (success) {
        // Show success toast when printing succeeds
        showToast('success', 'พิมพ์ใบเสร็จสำเร็จ')
      } else {
        // Use a small delay to ensure the hook's error state is updated
        setTimeout(() => {
          setBluetoothPrintError(printerError || 'พิมพ์ไม่สำเร็จ กรุณาลองใหม่')
        }, 100)
      }
    } catch (err) {
      // Handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการพิมพ์'
      setBluetoothPrintError(errorMessage)
    }
  }

  /**
   * Smart print function with fallback
   * Tries Bluetooth first if connected, otherwise falls back to window.print()
   * Fallback: ใช้ window.print() ถ้าไม่มี Bluetooth
   */
  const handleSmartPrint = async () => {
    if (isConnected) {
      // Try Bluetooth printing first
      await handleBluetoothPrint()
    } else {
      // Fallback to browser print when Bluetooth is not available
      handlePrint()
    }
  }

  // Sync error from printer hook when it changes
  // This ensures we display the latest error message from the printer
  useEffect(() => {
    if (printerError && !bluetoothPrintError) {
      setBluetoothPrintError(printerError)
    }
  }, [printerError, bluetoothPrintError])

  // Share via native share API (text)
  const handleShareText = async () => {
    setShowShareMenu(false)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ใบเสร็จ #${sale.id.slice(-6)}`,
          text: generateReceiptText(),
        })
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(generateReceiptText())
        alert('คัดลอกใบเสร็จไปยังคลิปบอร์ดแล้ว')
      } catch {
        alert('ไม่สามารถแชร์ได้')
      }
    }
  }

  const paymentMethodText = {
    cash: 'เงินสด',
    transfer: 'โอนเงิน', 
    credit: 'วางบิล'
  }[sale.payment_method || 'cash']

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">ใบเสร็จ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-5 overflow-y-auto flex-1">
          {/* Store Info */}
          <div className="text-center mb-5">
            <p className="font-bold text-gray-800">ร้านน้ำแข็ง แก๊ส น้ำดื่ม</p>
            <p className="text-sm text-gray-500">#{sale.id.slice(-6)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(sale.created_at)}</p>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          {/* Items */}
          <div className="space-y-3 mb-4">
            {sale.items.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span className="text-gray-800">{item.product_name}</span>
                  <span className="font-medium">฿{item.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{item.quantity} x ฿{item.price.toLocaleString()}</span>
                  {item.gas_sale_type && (
                    <span className={
                      item.gas_sale_type === 'exchange' ? 'text-green-600' :
                      item.gas_sale_type === 'deposit' ? 'text-amber-600' : 'text-purple-600'
                    }>
                      {item.gas_sale_type === 'exchange' && 'แลกถัง'}
                      {item.gas_sale_type === 'deposit' && `ค้างถัง +฿${item.deposit_amount}`}
                      {item.gas_sale_type === 'outright' && 'ซื้อขาด'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          {/* Summary */}
          <div className="space-y-2 mb-4">
            {totalDeposit > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>ค่ามัดจำถัง</span>
                <span>+฿{totalDeposit.toLocaleString()}</span>
              </div>
            )}
            {sale.discount_amount && sale.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{sale.discount_name || 'ส่วนลด'}</span>
                <span>-฿{sale.discount_amount.toLocaleString()}</span>
              </div>
            )}
            {sale.points_used && sale.points_used > 0 && (
              <div className="flex justify-between text-sm text-yellow-600">
                <span>ใช้แต้ม ({sale.points_used})</span>
                <span>-฿{sale.points_used.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600">รวมทั้งสิ้น</span>
              <span className="text-2xl font-bold">฿{(sale.total + totalDeposit).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>รับเงิน</span>
              <span>฿{sale.payment.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>ทอน</span>
              <span className="text-green-600 font-medium">฿{sale.change.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-2 pt-2 border-t border-gray-200">
              <span>ชำระโดย</span>
              <span>{paymentMethodText}</span>
            </div>
          </div>

          {/* Customer */}
          {sale.customer_name && (
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                <span className="font-medium text-gray-800">{sale.customer_name}</span>
              </div>
              {sale.points_earned && sale.points_earned > 0 && (
                <p className="text-sm text-green-600 mt-1 ml-6">+{sale.points_earned} แต้ม</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-3">
            <p className="text-gray-400 text-sm">🙏 ขอบคุณที่ใช้บริการ</p>
            <p className="text-gray-300 text-xs mt-1">Thank you for your purchase</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* Bluetooth Print Button - AC-3.2: แสดงเมื่อเชื่อมต่อเครื่องพิมพ์แล้ว */}
          {isConnected && (
            <div className="space-y-2">
              <button
                onClick={handleBluetoothPrint}
                disabled={isPrinting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังพิมพ์...
                  </>
                ) : (
                  <>
                    <Bluetooth size={18} />
                    พิมพ์ใบเสร็จ (Bluetooth)
                  </>
                )}
              </button>
              
              {/* Error message - AC-3.5: แสดง error ถ้าพิมพ์ไม่สำเร็จ พร้อมปุ่มลองใหม่ */}
              {bluetoothPrintError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-700 font-medium">พิมพ์ไม่สำเร็จ</p>
                      <p className="text-sm text-red-600 mt-1">{bluetoothPrintError}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setBluetoothPrintError(null)
                        handleBluetoothPrint()
                      }}
                      disabled={isPrinting}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <RefreshCw size={14} />
                      ลองใหม่
                    </button>
                    {/* Fallback button - ใช้ window.print() แทน */}
                    <button
                      onClick={() => {
                        setBluetoothPrintError(null)
                        handlePrint()
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1"
                    >
                      <Printer size={14} />
                      พิมพ์ปกติ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleDownloadText}
              className="flex-1 py-3 border border-gray-200 rounded-lg font-medium flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50"
            >
              <Download size={18} />
              ดาวน์โหลด
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-3 bg-gray-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-700"
              title={isConnected ? 'พิมพ์ผ่านเบราว์เซอร์ (Fallback)' : 'พิมพ์ใบเสร็จ'}
            >
              <Printer size={18} />
              พิมพ์
            </button>
          </div>
          
          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={isGenerating}
              className="w-full py-3 border border-blue-200 bg-blue-50 rounded-lg font-medium flex items-center justify-center gap-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  แชร์ใบเสร็จ
                </>
              )}
            </button>
            
            {/* Share Menu Dropdown */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={handleShareText}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50"
                >
                  <FileText size={18} className="text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700">แชร์เป็นข้อความ</p>
                    <p className="text-xs text-gray-400">ส่งผ่าน Line, WhatsApp</p>
                  </div>
                </button>
                <button
                  onClick={handleShareImage}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 border-t border-gray-100"
                >
                  <Image size={18} className="text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-700">แชร์เป็นรูปภาพ</p>
                    <p className="text-xs text-gray-400">บันทึกหรือส่งเป็นรูป</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
