import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, Database, Package, Users,
  ShoppingCart, FileJson, FileSpreadsheet, Calendar, AlertCircle,
  CheckCircle, Loader2, History, Tag, RefreshCw
} from 'lucide-react'
import { BackupManager, BackupData, ExportOptions, ImportResult } from '../lib/backupManager'
import { useToast } from '../components/Toast'
import { LoadingSpinner } from '../components/LoadingSpinner'

type ExportFormat = 'json' | 'csv'
type DataType = 'all' | 'products' | 'sales' | 'customers'

export function BackupPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [dataType, setDataType] = useState<DataType>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Backup reminder
  const [showReminder, setShowReminder] = useState(false)
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null)

  useEffect(() => {
    setShowReminder(BackupManager.shouldShowBackupReminder())
    setLastBackupDate(BackupManager.getLastBackupDate())
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const options: ExportOptions = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        format: exportFormat
      }

      if (exportFormat === 'csv') {
        // CSV export - single data type
        switch (dataType) {
          case 'products':
            await BackupManager.exportProductsToCSV()
            break
          case 'sales':
            await BackupManager.exportSalesToCSV(options.startDate, options.endDate)
            break
          case 'customers':
            await BackupManager.exportCustomersToCSV()
            break
          case 'all':
            // Export all as separate CSV files
            await BackupManager.exportProductsToCSV()
            await BackupManager.exportSalesToCSV(options.startDate, options.endDate)
            await BackupManager.exportCustomersToCSV()
            break
        }
        showToast('success', 'ส่งออกข้อมูล CSV สำเร็จ', 2000)
      } else {
        // JSON export - full backup
        const exportOptions: ExportOptions = {
          includeProducts: dataType === 'all' || dataType === 'products',
          includeSales: dataType === 'all' || dataType === 'sales',
          includeCustomers: dataType === 'all' || dataType === 'customers',
          includeStockLogs: dataType === 'all',
          includeStockReceipts: dataType === 'all',
          includeDiscounts: dataType === 'all',
          startDate: options.startDate,
          endDate: options.endDate
        }

        const backup = await BackupManager.createFullBackup(exportOptions)
        const filename = dataType === 'all' 
          ? `full-backup-${new Date().toISOString().split('T')[0]}.json`
          : `${dataType}-backup-${new Date().toISOString().split('T')[0]}.json`
        
        BackupManager.downloadAsJSON(backup, filename)
        showToast('success', 'สำรองข้อมูลสำเร็จ', 2000)
        
        // Update reminder state
        setShowReminder(false)
        setLastBackupDate(new Date())
      }
    } catch (err) {
      showToast('error', `เกิดข้อผิดพลาด: ${(err as Error).message}`, 3000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      showToast('error', 'กรุณาเลือกไฟล์ JSON', 2000)
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const backupData: BackupData = JSON.parse(text)

      // Validate backup structure
      if (!backupData.version || !backupData.data) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง')
      }

      // Confirm import
      const confirmMsg = `ต้องการนำเข้าข้อมูลจากไฟล์ "${file.name}" หรือไม่?\n\n` +
        `- สินค้า: ${backupData.data.products?.length || 0} รายการ\n` +
        `- ลูกค้า: ${backupData.data.customers?.length || 0} รายการ\n` +
        `- ส่วนลด: ${backupData.data.discounts?.length || 0} รายการ\n\n` +
        `หมายเหตุ: ข้อมูลที่มีอยู่แล้วจะถูกอัพเดท`

      if (!confirm(confirmMsg)) {
        setIsImporting(false)
        return
      }

      const result = await BackupManager.importFromBackup(backupData)
      setImportResult(result)

      if (result.success) {
        showToast('success', 'นำเข้าข้อมูลสำเร็จ', 2000)
      } else if (result.errors.length > 0) {
        showToast('error', `นำเข้าบางส่วนสำเร็จ มี ${result.errors.length} ข้อผิดพลาด`, 3000)
      }
    } catch (err) {
      showToast('error', `เกิดข้อผิดพลาด: ${(err as Error).message}`, 3000)
      setImportResult({
        success: false,
        imported: { products: 0, customers: 0, discounts: 0 },
        errors: [(err as Error).message]
      })
    } finally {
      setIsImporting(false)
    }
  }

  const dismissReminder = () => {
    BackupManager.dismissBackupReminder()
    setShowReminder(false)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'ยังไม่เคยสำรอง'
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">💾 สำรองและนำเข้าข้อมูล</h1>
            <p className="text-xs text-gray-500">Backup & Import</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Backup Reminder */}
        {showReminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900 mb-1">แนะนำให้สำรองข้อมูล</h3>
                <p className="text-sm text-amber-800 mb-2">
                  {lastBackupDate 
                    ? `สำรองข้อมูลล่าสุด: ${formatDate(lastBackupDate)}`
                    : 'คุณยังไม่เคยสำรองข้อมูล ควรสำรองข้อมูลเป็นประจำเพื่อป้องกันข้อมูลสูญหาย'
                  }
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg"
                  >
                    สำรองเลย
                  </button>
                  <button
                    onClick={dismissReminder}
                    className="px-3 py-1.5 text-amber-700 text-sm"
                  >
                    เตือนทีหลัง
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Backup Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">สำรองข้อมูลล่าสุด</p>
              <p className="font-medium text-gray-800">{formatDate(lastBackupDate)}</p>
            </div>
            <RefreshCw 
              size={18} 
              className="text-gray-400 cursor-pointer hover:text-gray-600"
              onClick={() => setLastBackupDate(BackupManager.getLastBackupDate())}
            />
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Download size={18} />
            ส่งออกข้อมูล (Export)
          </h2>

          {/* Data Type Selection */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-2 block">เลือกประเภทข้อมูล</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: 'ทั้งหมด', icon: Database },
                { value: 'products', label: 'สินค้า', icon: Package },
                { value: 'sales', label: 'ยอดขาย', icon: ShoppingCart },
                { value: 'customers', label: 'ลูกค้า', icon: Users }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setDataType(value as DataType)}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    dataType === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-2 block">รูปแบบไฟล์</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat('json')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border ${
                  exportFormat === 'json'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <FileJson size={18} />
                <span className="text-sm font-medium">JSON</span>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border ${
                  exportFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <FileSpreadsheet size={18} />
                <span className="text-sm font-medium">CSV (Excel)</span>
              </button>
            </div>
          </div>

          {/* Date Range (for sales) */}
          {(dataType === 'all' || dataType === 'sales') && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <Calendar size={14} />
                ช่วงวันที่ (สำหรับยอดขาย)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="เริ่มต้น"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="สิ้นสุด"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">ว่างไว้ = ทั้งหมด</p>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                กำลังส่งออก...
              </>
            ) : (
              <>
                <Download size={18} />
                ส่งออกข้อมูล
              </>
            )}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload size={18} />
            นำเข้าข้อมูล (Import)
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            นำเข้าข้อมูลจากไฟล์ JSON ที่สำรองไว้ก่อนหน้า
            ข้อมูลที่มีอยู่แล้วจะถูกอัพเดท (ไม่ลบข้อมูลเดิม)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                กำลังนำเข้า...
              </>
            ) : (
              <>
                <Upload size={18} />
                เลือกไฟล์ JSON
              </>
            )}
          </button>

          {/* Import Result */}
          {importResult && (
            <div className={`mt-4 p-3 rounded-lg ${
              importResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <CheckCircle className="text-green-600" size={18} />
                ) : (
                  <AlertCircle className="text-red-600" size={18} />
                )}
                <span className={`font-medium ${
                  importResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResult.success ? 'นำเข้าสำเร็จ' : 'นำเข้าไม่สำเร็จ'}
                </span>
              </div>
              
              <div className="text-sm space-y-1">
                <p className="text-gray-600">
                  สินค้า: {importResult.imported.products} รายการ
                </p>
                <p className="text-gray-600">
                  ลูกค้า: {importResult.imported.customers} รายการ
                </p>
                <p className="text-gray-600">
                  ส่วนลด: {importResult.imported.discounts} รายการ
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-1">
                    ข้อผิดพลาด ({importResult.errors.length}):
                  </p>
                  <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>... และอีก {importResult.errors.length - 5} รายการ</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Export Buttons */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={18} />
            ส่งออกด่วน (CSV)
          </h2>

          <div className="space-y-2">
            <QuickExportButton
              icon={Package}
              label="ส่งออกสินค้า"
              onClick={() => BackupManager.exportProductsToCSV()}
              showToast={showToast}
            />
            <QuickExportButton
              icon={ShoppingCart}
              label="ส่งออกยอดขาย"
              onClick={() => BackupManager.exportSalesToCSV()}
              showToast={showToast}
            />
            <QuickExportButton
              icon={Users}
              label="ส่งออกลูกค้า"
              onClick={() => BackupManager.exportCustomersToCSV()}
              showToast={showToast}
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-100 rounded-xl p-4">
          <h3 className="font-medium text-gray-700 mb-2">💡 คำแนะนำ</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• ควรสำรองข้อมูลอย่างน้อยสัปดาห์ละครั้ง</li>
            <li>• ไฟล์ JSON เหมาะสำหรับการสำรองและกู้คืนข้อมูล</li>
            <li>• ไฟล์ CSV เหมาะสำหรับเปิดใน Excel หรือ Google Sheets</li>
            <li>• เก็บไฟล์สำรองไว้ในที่ปลอดภัย เช่น Google Drive</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Quick Export Button Component
function QuickExportButton({ 
  icon: Icon, 
  label, 
  onClick, 
  showToast 
}: { 
  icon: typeof Package
  label: string
  onClick: () => Promise<void>
  showToast: (type: 'success' | 'error', message: string, duration?: number) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await onClick()
      showToast('success', `${label}สำเร็จ`, 2000)
    } catch (err) {
      showToast('error', `เกิดข้อผิดพลาด: ${(err as Error).message}`, 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={18} className="text-gray-400 animate-spin" />
      ) : (
        <Icon size={18} className="text-gray-400" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
      <Download size={14} className="text-gray-400 ml-auto" />
    </button>
  )
}
