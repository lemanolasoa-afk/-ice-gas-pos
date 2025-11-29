/**
 * Melt Loss Calculation Utilities
 * ฟังก์ชันสำหรับคำนวณการสูญเสียจากการละลายของน้ำแข็ง
 */

/**
 * คำนวณจำนวนที่ละลาย
 * @param expectedStock - สต๊อกที่ควรเหลือ (system - sold)
 * @param actualStock - สต๊อกจริงที่นับได้
 * @returns จำนวนที่ละลาย (ไม่ติดลบ)
 */
export function calculateMeltLoss(expectedStock: number, actualStock: number): number {
  const loss = expectedStock - actualStock
  return Math.max(0, loss) // ไม่ติดลบ
}

/**
 * คำนวณเปอร์เซ็นต์การละลาย
 * @param meltLoss - จำนวนที่ละลาย
 * @param expectedStock - สต๊อกที่ควรเหลือ
 * @returns เปอร์เซ็นต์การละลาย
 */
export function calculateMeltPercent(meltLoss: number, expectedStock: number): number {
  if (expectedStock <= 0) return 0
  return (meltLoss / expectedStock) * 100
}

/**
 * คำนวณมูลค่าที่สูญเสีย
 * @param meltLoss - จำนวนที่ละลาย
 * @param costPerUnit - ต้นทุนต่อหน่วย
 * @returns มูลค่าที่สูญเสีย
 */
export function calculateMeltLossValue(meltLoss: number, costPerUnit: number): number {
  return meltLoss * costPerUnit
}

/**
 * ตรวจสอบว่าการละลายผิดปกติหรือไม่
 * @param meltPercent - % การละลายจริง
 * @param expectedPercent - % ที่คาดการณ์
 * @param threshold - ค่า threshold (default 1.5 = 150%)
 * @returns true ถ้าละลายผิดปกติ
 */
export function isAbnormalMelt(
  meltPercent: number, 
  expectedPercent: number, 
  threshold: number = 1.5
): boolean {
  if (expectedPercent <= 0) return meltPercent > 10 // ถ้าไม่มีค่าคาดการณ์ ใช้ 10% เป็น threshold
  return meltPercent > (expectedPercent * threshold)
}

/**
 * คำนวณสต๊อกที่ควรเหลือ
 * @param systemStock - สต๊อกในระบบ
 * @param soldToday - ขายวันนี้
 * @returns สต๊อกที่ควรเหลือ
 */
export function calculateExpectedStock(systemStock: number, soldToday: number): number {
  return Math.max(0, systemStock - soldToday)
}

/**
 * คำนวณข้อมูลทั้งหมดสำหรับการปิดยอด
 */
export interface MeltLossCalculationResult {
  expectedStock: number
  meltLoss: number
  meltPercent: number
  meltLossValue: number
  isAbnormal: boolean
}

export function calculateAllMeltLossData(
  systemStock: number,
  soldToday: number,
  actualStock: number,
  expectedMeltPercent: number,
  costPerUnit: number
): MeltLossCalculationResult {
  const expectedStock = calculateExpectedStock(systemStock, soldToday)
  const meltLoss = calculateMeltLoss(expectedStock, actualStock)
  const meltPercent = calculateMeltPercent(meltLoss, expectedStock)
  const meltLossValue = calculateMeltLossValue(meltLoss, costPerUnit)
  const abnormal = isAbnormalMelt(meltPercent, expectedMeltPercent)

  return {
    expectedStock,
    meltLoss,
    meltPercent: Math.round(meltPercent * 100) / 100, // 2 decimal places
    meltLossValue,
    isAbnormal: abnormal
  }
}

/**
 * Format เปอร์เซ็นต์สำหรับแสดงผล
 */
export function formatMeltPercent(percent: number): string {
  return `${percent.toFixed(1)}%`
}

/**
 * Format มูลค่าสำหรับแสดงผล
 */
export function formatMeltValue(value: number): string {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
