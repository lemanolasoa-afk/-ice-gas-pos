import { useRef } from 'react'
import { X, Printer, Download, Store } from 'lucide-react'
import { Sale } from '../types'

interface Props {
  sale: Sale
  onClose: () => void
}

export function ReceiptModal({ sale, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePrint = () => {
    const printContent = receiptRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบเสร็จ #${sale.id.slice(-6)}</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin: 0; }
          .header p { font-size: 12px; color: #666; margin: 5px 0; }
          .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 14px; margin: 5px 0; }
          .item-name { flex: 1; }
          .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 10px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleDownload = () => {
    const receiptText = `
ร้านน้ำแข็ง แก๊ส น้ำดื่ม
================================
ใบเสร็จ #${sale.id.slice(-6)}
${formatDate(sale.created_at)}
================================
${sale.items.map((item) => `${item.product_name} x${item.quantity}  ฿${item.subtotal}`).join('\n')}
================================
รวม: ฿${sale.total}
${sale.discount_amount ? `ส่วนลด: -฿${sale.discount_amount}\n` : ''}รับเงิน: ฿${sale.payment}
ทอน: ฿${sale.change}
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">ใบเสร็จ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6">
          <div className="header text-center mb-4">
            <Store className="mx-auto text-gray-600 mb-2" size={28} />
            <h1 className="text-base font-semibold text-gray-800">ร้านน้ำแข็ง แก๊ส น้ำดื่ม</h1>
            <p className="text-sm text-gray-500">ใบเสร็จ #{sale.id.slice(-6)}</p>
            <p className="text-xs text-gray-400">{formatDate(sale.created_at)}</p>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          <div className="space-y-2">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="flex-1 text-gray-700">
                  {item.product_name} x{item.quantity}
                </span>
                <span className="text-gray-700">฿{item.subtotal}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          <div className="space-y-1">
            {sale.discount_amount && sale.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>ส่วนลด</span>
                <span>-฿{sale.discount_amount}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base">
              <span className="text-gray-800">รวม</span>
              <span className="text-gray-800">฿{sale.total}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>รับเงิน</span>
              <span>฿{sale.payment}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>ทอน</span>
              <span>฿{sale.change}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 my-4" />

          <p className="footer text-center text-sm text-gray-400">ขอบคุณที่ใช้บริการ</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 border border-gray-200 rounded-lg font-medium flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50"
          >
            <Download size={18} />
            ดาวน์โหลด
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-gray-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-700"
          >
            <Printer size={18} />
            พิมพ์
          </button>
        </div>
      </div>
    </div>
  )
}
