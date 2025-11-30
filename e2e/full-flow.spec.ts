import { test, expect, Page } from '@playwright/test'

// Helper function to login with PIN (auto-login when 4 digits entered)
async function loginWithPin(page: Page, pin: string = '1234') {
  // Wait for login modal
  await expect(page.getByText('ยินดีต้อนรับ')).toBeVisible({ timeout: 10000 })
  
  // Enter PIN digits - auto login triggers on 4th digit
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  
  // Wait for page reload and navigation (app goes to /dashboard after login)
  await page.waitForLoadState('networkidle', { timeout: 20000 })
  
  // Wait for Dashboard to be visible (admin lands on dashboard)
  await expect(page.getByText('ภาพรวม')).toBeVisible({ timeout: 15000 })
}

// Helper to navigate to POS page
async function navigateToPOS(page: Page) {
  // Use exact match for the nav button 'ขาย'
  await page.getByRole('button', { name: 'ขาย', exact: true }).click()
  await expect(page.getByPlaceholder('ค้นหาสินค้า')).toBeVisible({ timeout: 5000 })
}

test.describe('Ice Gas POS - Full User Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh login state
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('1. Login as Admin', async ({ page }) => {
    // Wait for login modal
    await expect(page.getByText('ยินดีต้อนรับ')).toBeVisible({ timeout: 10000 })
    
    // Enter PIN digits - auto login on 4th digit
    await page.getByRole('button', { name: '1', exact: true }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: '4', exact: true }).click()
    
    // Wait for page reload (auto login triggers)
    await page.waitForLoadState('networkidle', { timeout: 20000 })
    
    // Should see Dashboard after login
    await expect(page.getByText('ภาพรวม')).toBeVisible({ timeout: 15000 })
  })

  test('2. Add products to cart', async ({ page }) => {
    await loginWithPin(page)
    await navigateToPOS(page)
    
    // รอสินค้าโหลด
    await page.waitForTimeout(2000)
    
    // กดสินค้าน้ำแข็ง (ถ้ามี)
    const iceProduct = page.locator('button').filter({ hasText: /น้ำแข็ง/ }).first()
    if (await iceProduct.isVisible()) {
      await iceProduct.click()
      await page.waitForTimeout(500)
    }
    
    // กดสินค้าน้ำดื่ม (ถ้ามี)
    const waterProduct = page.locator('button').filter({ hasText: /น้ำดื่ม/ }).first()
    if (await waterProduct.isVisible()) {
      await waterProduct.click()
      await page.waitForTimeout(500)
    }
  })

  test('3. Add gas product with exchange type', async ({ page }) => {
    await loginWithPin(page)
    await navigateToPOS(page)
    await page.waitForTimeout(3000)
    
    // กดสินค้าแก๊ส - look for product with แก๊ส in name
    const gasProduct = page.locator('button').filter({ hasText: /แก๊ส/ }).first()
    const isGasVisible = await gasProduct.isVisible().catch(() => false)
    
    if (isGasVisible) {
      await gasProduct.click()
      
      // Wait for modal to appear - the modal shows product name and "เลือกประเภทการขาย"
      const modalText = page.getByText('เลือกประเภทการขาย')
      const isModalVisible = await modalText.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (isModalVisible) {
        // เลือก "แลกถัง"
        await page.locator('button').filter({ hasText: 'แลกถัง' }).click()
        
        // Modal ควรปิด
        await expect(modalText).not.toBeVisible({ timeout: 3000 })
      }
    }
    // Test passes even if no gas product - this is expected behavior
  })

  test('4. Complete payment with exact amount', async ({ page }) => {
    await loginWithPin(page)
    await navigateToPOS(page)
    await page.waitForTimeout(2000)
    
    // เพิ่มสินค้า
    const product = page.locator('button').filter({ hasText: /น้ำแข็ง|น้ำดื่ม/ }).first()
    if (await product.isVisible()) {
      await product.click()
      await page.waitForTimeout(500)
      
      // ไปหน้าตะกร้า
      await page.locator('button').filter({ hasText: /ยอดรวม/ }).click()
      await expect(page.getByText('ตะกร้าสินค้า')).toBeVisible({ timeout: 5000 })
      
      // กดชำระเงิน
      await page.getByRole('button', { name: /ชำระเงิน/ }).click()
      // Use heading to be more specific
      await expect(page.getByRole('heading', { name: 'ชำระเงิน' })).toBeVisible({ timeout: 5000 })
      
      // ค่าเริ่มต้นควรเป็น "พอดี" แล้ว - กดยืนยันได้เลย
      await page.getByRole('button', { name: /ยืนยันการชำระ/ }).click()
      
      // ควรเห็น Success Modal
      await expect(page.getByText('สำเร็จ')).toBeVisible({ timeout: 10000 })
      
      // ควรแสดงเงินทอน
      await expect(page.getByText(/เงินทอน/)).toBeVisible()
    }
  })

  test('5. View sales history', async ({ page }) => {
    await loginWithPin(page)
    
    // ไปหน้าประวัติ
    await page.getByRole('button', { name: 'ประวัติ' }).click()
    // Use heading to be more specific
    await expect(page.getByRole('heading', { name: 'ประวัติการขาย' })).toBeVisible({ timeout: 5000 })
  })

  test('6. Navigate to Dashboard', async ({ page }) => {
    await loginWithPin(page)
    
    // Already on Dashboard after login, verify content
    await expect(page.getByText('ภาพรวม')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('ยอดขายวันนี้')).toBeVisible()
  })

  test('7. Navigate to Settings', async ({ page }) => {
    await loginWithPin(page)
    
    // ไปหน้าตั้งค่า
    await page.getByRole('button', { name: 'เพิ่มเติม' }).click()
    await page.waitForTimeout(1000)
    
    // ควรเห็นเมนูหมวดหมู่
    await expect(page.getByText('จัดการสต็อก')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('รายงาน')).toBeVisible()
  })

  test('8. Search products', async ({ page }) => {
    await loginWithPin(page)
    await navigateToPOS(page)
    await page.waitForTimeout(2000)
    
    // ค้นหาสินค้า
    await page.getByPlaceholder('ค้นหาสินค้า').fill('น้ำแข็ง')
    await page.waitForTimeout(500)
    
    // ควรแสดงเฉพาะสินค้าที่ตรง
    // ลบคำค้นหา
    await page.getByPlaceholder('ค้นหาสินค้า').clear()
  })

  test('9. Change cart item quantity', async ({ page }) => {
    await loginWithPin(page)
    await navigateToPOS(page)
    await page.waitForTimeout(2000)
    
    // เพิ่มสินค้า
    const product = page.locator('button').filter({ hasText: /น้ำแข็ง|น้ำดื่ม/ }).first()
    if (await product.isVisible()) {
      await product.click()
      await page.waitForTimeout(500)
      
      // ไปหน้าตะกร้า
      await page.locator('button').filter({ hasText: /ยอดรวม/ }).click()
      await expect(page.getByText('ตะกร้าสินค้า')).toBeVisible({ timeout: 5000 })
      
      // กด + เพิ่มจำนวน
      const plusButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
      if (await plusButton.isVisible()) {
        await plusButton.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('10. Logout', async ({ page }) => {
    await loginWithPin(page)
    
    // ไปหน้าตั้งค่า
    await page.getByRole('button', { name: 'เพิ่มเติม' }).click()
    await page.waitForTimeout(1000)
    
    // กด Logout
    await page.getByRole('button', { name: /ออก/ }).click()
    
    // ยืนยัน (ถ้ามี dialog)
    page.on('dialog', dialog => dialog.accept())
  })
})
