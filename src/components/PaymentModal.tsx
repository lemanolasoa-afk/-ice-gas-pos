import { useState, useEffect } from 'react'
import { X, Check, Banknote, Loader2, Users, Star, Search, Wallet, FileText, UserPlus, Phone } from 'lucide-react'
import { useStore } from '../store/useStore'
import { validatePayment, addQuickAmount } from '../lib/payment'
import { supabase } from '../lib/supabase'
import { Customer } from '../types'
import { useToast } from './Toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (change: number) => void
}

type PaymentMethod = 'cash' | 'transfer' | 'credit'

const paymentMethods = [
  { id: 'cash' as PaymentMethod, name: 'เงินสด', icon: Banknote },
  { id: 'transfer' as PaymentMethod, name: 'โอนเงิน', icon: Wallet },
  { id: 'credit' as PaymentMethod, name: 'วางบิล', icon: FileText },
]

const quickAmounts = [20, 50, 100, 500, 1000]
const POINTS_PER_BAHT = 1
const BAHT_PER_POINT = 1

export function PaymentModal({ isOpen, onClose, onSuccess }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [payment, setPayment] = useState('')
  const [note, setNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const { getTotal, getDepositTotal, completeSale } = useStore()
  const { showToast } = useToast()
  
  const baseTotal = getTotal()
  const depositTotal = getDepositTotal()
  const pointsDiscount = pointsToUse * BAHT_PER_POINT
  const total = Math.max(0, baseTotal + depositTotal - pointsDiscount)

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
    }
  }, [isOpen])

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    if (data) setCustomers(data)
  }

  if (!isOpen) return null

  const paymentAmount = parseInt(payment) || 0
  const validation = validatePayment(paymentAmount, total)
  const pointsEarned = Math.floor(total * POINTS_PER_BAHT)

  // For transfer/credit, payment is exact amount
  const effectivePayment = paymentMethod === 'cash' ? paymentAmount : total
  const effectiveChange = paymentMethod === 'cash' ? validation.change : 0
  const canPay = paymentMethod === 'cash' 
    ? validation.isValid 
    : (paymentMethod === 'credit' ? !!selectedCustomer : true) // Credit requires customer

  const handlePay = async () => {
    setIsProcessing(true)
    setPaymentError(null)
    try {
      const sale = await completeSale(effectivePayment, {
        customerId: selectedCustomer?.id,
        discountAmount: pointsDiscount,
        pointsUsed: pointsToUse,
        pointsEarned,
        paymentMethod,
        note: note || undefined,
      })
      
      if (sale) {
        // Update customer points
        if (selectedCustomer) {
          const newPoints = selectedCustomer.points - pointsToUse + pointsEarned
          await supabase
            .from('customers')
            .update({
              points: newPoints,
              total_spent: selectedCustomer.total_spent + total,
              visit_count: selectedCustomer.visit_count + 1,
            })
            .eq('id', selectedCustomer.id)
        }
        
        onSuccess(effectiveChange)
        resetForm()
      } else {
        setPaymentError('ไม่สามารถบันทึกการขายได้ กรุณาลองใหม่')
      }
    } catch (err) {
      setPaymentError((err as Error).message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setPaymentMethod('cash')
    setPayment('')
    setNote('')
    setSelectedCustomer(null)
    setPointsToUse(0)
    setSearchQuery('')
  }

  const handleQuickAmount = (amount: number) => {
    setPayment((prev) => {
      const current = parseInt(prev) || 0
      return addQuickAmount(current, amount).toString()
    })
  }

  const handleExact = () => {
    setPayment(total.toString())
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerSearch(false)
    setSearchQuery('')
    setPointsToUse(0)
  }

  const handleUseAllPoints = () => {
    if (selectedCustomer) {
      const maxPoints = Math.min(selectedCustomer.points, baseTotal)
      setPointsToUse(maxPoints)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return
    
    setIsAddingCustomer(true)
    try {
      const newCustomer = {
        id: `cust-${Date.now()}`,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        points: 0,
        total_spent: 0,
        visit_count: 0,
      }
      
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()
      
      if (error) throw error
      
      // Select the new customer
      setSelectedCustomer(data)
      setShowAddCustomer(false)
      setShowCustomerSearch(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      showToast('success', `เพิ่มลูกค้า "${data.name}" สำเร็จ`, 2000)
      
      // Refresh customer list
      fetchCustomers()
    } catch (err) {
      showToast('error', 'ไม่สามารถเพิ่มลูกค้าได้', 2000)
    } finally {
      setIsAddingCustomer(false)
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 modal-backdrop">
      <div className="bg-white w-full sm:w-96 sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-auto animate-slide-in-bottom">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">ชำระเงิน</h2>
          <button onClick={() => { onClose(); resetForm() }} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Customer Selection */}
        <div className="mb-4">
          {selectedCustomer ? (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="text-gray-600" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Star size={14} /> {selectedCustomer.points} แต้ม
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedCustomer(null); setPointsToUse(0) }}
                className="text-sm text-gray-500"
              >
                เปลี่ยน
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerSearch(true)}
              className={`w-full py-3 border border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${
                paymentMethod === 'credit'
                  ? 'border-gray-400 bg-gray-50 text-gray-700'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              <Users size={20} />
              {paymentMethod === 'credit' ? 'กรุณาเลือกลูกค้า (บังคับ)' : 'เลือกลูกค้าสมาชิก (ไม่บังคับ)'}
            </button>
          )}
        </div>

        {/* Points Usage */}
        {selectedCustomer && selectedCustomer.points > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">ใช้แต้มแลกส่วนลด</span>
              <button
                onClick={handleUseAllPoints}
                className="text-xs text-gray-600 underline"
              >
                ใช้ทั้งหมด
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={Math.min(selectedCustomer.points, baseTotal)}
                value={pointsToUse}
                onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 w-20 text-right">
                {pointsToUse} แต้ม
              </span>
            </div>
            {pointsToUse > 0 && (
              <p className="text-sm text-gray-600 mt-1">ลด ฿{pointsDiscount}</p>
            )}
          </div>
        )}

        {/* Payment Method Selection */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">วิธีชำระเงิน</label>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = paymentMethod === method.id
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-gray-800 text-white border-gray-800' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{method.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-500 mb-1">ยอดที่ต้องชำระ</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-800">฿{total.toLocaleString()}</p>
            {(pointsDiscount > 0 || depositTotal > 0) && (
              <span className="text-sm text-gray-400 line-through">฿{baseTotal}</span>
            )}
          </div>
          {depositTotal > 0 && (
            <p className="text-xs text-orange-600 mt-1">รวมค่ามัดจำถัง ฿{depositTotal.toLocaleString()}</p>
          )}
          {selectedCustomer && (
            <p className="text-xs text-gray-500 mt-1">จะได้รับ {pointsEarned} แต้ม</p>
          )}
        </div>

        {/* Cash Payment Input */}
        {paymentMethod === 'cash' && (
          <>
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">รับเงิน</label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 text-xl font-semibold border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleExact}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                พอดี
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  +{amount}
                </button>
              ))}
            </div>

            {/* Change Display */}
            {paymentAmount > 0 && (
              <div className={`rounded-lg p-4 mb-4 ${validation.isValid ? 'bg-gray-50' : 'bg-gray-100'}`}>
                <p className={`text-sm ${validation.isValid ? 'text-gray-600' : 'text-gray-500'} mb-1`}>
                  {validation.message}
                </p>
                <p className={`text-xl font-semibold ${validation.isValid ? 'text-gray-800' : 'text-gray-500'}`}>
                  ฿{Math.abs(validation.change).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}

        {/* Transfer Payment */}
        {paymentMethod === 'transfer' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <Wallet className="mx-auto text-gray-600 mb-2" size={28} />
            <p className="text-sm text-gray-500 mb-1">โอนเงินจำนวน</p>
            <p className="text-xl font-semibold text-gray-800">฿{total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">กรุณาตรวจสอบยอดโอนก่อนยืนยัน</p>
          </div>
        )}

        {/* Credit/Billing */}
        {paymentMethod === 'credit' && (
          <div className="space-y-4 mb-4">
            <div className={`rounded-lg p-4 text-center ${selectedCustomer ? 'bg-gray-50' : 'bg-gray-100'}`}>
              <FileText className={`mx-auto mb-2 ${selectedCustomer ? 'text-gray-600' : 'text-gray-400'}`} size={28} />
              <p className={`text-sm mb-1 ${selectedCustomer ? 'text-gray-500' : 'text-gray-400'}`}>วางบิลจำนวน</p>
              <p className={`text-xl font-semibold ${selectedCustomer ? 'text-gray-800' : 'text-gray-400'}`}>฿{total.toLocaleString()}</p>
              {selectedCustomer && (
                <p className="text-xs text-gray-500 mt-2">ลูกค้า: {selectedCustomer.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">หมายเหตุ (ไม่บังคับ)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ครบกำหนด 30 วัน"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {paymentError && (
          <div className="rounded-lg p-4 mb-4 bg-gray-100">
            <p className="text-sm text-gray-700">{paymentError}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={!canPay || isProcessing}
          className={`w-full py-3 rounded-lg font-medium text-base flex items-center justify-center gap-2 transition-colors ${
            canPay && !isProcessing
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Check size={20} />
              ยืนยันการชำระ
            </>
          )}
        </button>
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">เลือกลูกค้า</h3>
                <button
                  onClick={() => setShowCustomerSearch(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="overflow-auto max-h-[50vh]">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="mx-auto text-gray-300 mb-2" size={36} />
                  <p className="text-gray-400 text-sm mb-3">
                    {searchQuery ? `ไม่พบ "${searchQuery}"` : 'ยังไม่มีลูกค้า'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 border-b border-gray-50 hover:bg-gray-50 text-left transition-colors"
                  >
                    <p className="font-medium text-gray-800">{customer.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      {customer.phone && <span>{customer.phone}</span>}
                      <span className="text-gray-500 flex items-center gap-1">
                        <Star size={10} /> {customer.points} แต้ม
                      </span>
                    </p>
                  </button>
                ))
              )}
            </div>
            
            {/* Add New Customer Button */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowAddCustomer(true)
                  setNewCustomerName(searchQuery)
                }}
                className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-700"
              >
                <UserPlus size={18} />
                เพิ่มลูกค้าใหม่ {searchQuery && `"${searchQuery}"`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <UserPlus size={18} className="text-gray-600" />
                เพิ่มลูกค้าใหม่
              </h3>
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomerName('')
                  setNewCustomerPhone('')
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">ชื่อลูกค้า *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล หรือ ชื่อร้าน"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 mb-1 block">เบอร์โทร (ไม่บังคับ)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="0xx-xxx-xxxx"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomerName('')
                  setNewCustomerPhone('')
                }}
                className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomerName.trim() || isAddingCustomer}
                className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  newCustomerName.trim() && !isAddingCustomer
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isAddingCustomer ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
