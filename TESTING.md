# Testing & Quality Assurance - Ice Gas POS

## Test Summary

| Test Type | Files | Tests | Status |
|-----------|-------|-------|--------|
| Property-based | 11 | 169 | ✅ Pass |
| Integration | 1 | 14 | ✅ Pass |
| **Total** | **13** | **182** | ✅ **All Pass** |

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Manual Testing Checklist

### 1. POS (Point of Sale) - หน้าขาย

- [ ] เพิ่มสินค้าลงตะกร้าได้
- [ ] เพิ่มจำนวนสินค้าในตะกร้าได้
- [ ] ลดจำนวนสินค้าในตะกร้าได้
- [ ] ลบสินค้าออกจากตะกร้าได้
- [ ] ล้างตะกร้าทั้งหมดได้
- [ ] คำนวณยอดรวมถูกต้อง
- [ ] สแกน barcode เพิ่มสินค้าได้
- [ ] กรองสินค้าตาม category ได้

### 2. Gas Cylinder - ระบบแก๊ส

- [ ] ขายแบบแลกถัง (exchange) - ราคาปกติ
- [ ] ขายแบบมัดจำ (deposit) - ราคา + ค่ามัดจำ
- [ ] ขายแบบซื้อขาด (outright) - ราคาซื้อขาด
- [ ] คืนถังแก๊ส - คืนเงินมัดจำ
- [ ] เติมแก๊สถังเปล่า - แปลง empty → full
- [ ] สต็อกถังเต็ม/ถังเปล่าอัพเดทถูกต้อง

### 3. Payment - การชำระเงิน

- [ ] ชำระเงินสด - คำนวณเงินทอนถูกต้อง
- [ ] ชำระโอน - ไม่มีเงินทอน
- [ ] ชำระเครดิต - บันทึกยอดค้าง
- [ ] ใช้ส่วนลดได้
- [ ] ใช้แต้มสะสมได้
- [ ] เลือกลูกค้าได้

### 4. Receipt - ใบเสร็จ

- [ ] แสดงรายการสินค้าถูกต้อง
- [ ] แสดงยอดรวม/ส่วนลด/เงินทอนถูกต้อง
- [ ] พิมพ์ใบเสร็จได้
- [ ] แชร์ใบเสร็จได้
- [ ] พิมพ์ซ้ำจากประวัติได้

### 5. Products - สินค้า

- [ ] ดูรายการสินค้าได้
- [ ] เพิ่มสินค้าใหม่ได้
- [ ] แก้ไขสินค้าได้
- [ ] ลบสินค้าได้
- [ ] แสดง % กำไรถูกต้อง
- [ ] แสดงมูลค่าสต็อกถูกต้อง

### 6. Stock - สต็อก

- [ ] รับสินค้าเข้าสต็อกได้
- [ ] ดูประวัติสต็อกได้
- [ ] แจ้งเตือนสต็อกต่ำ
- [ ] อัพเดทต้นทุนเมื่อรับสินค้า

### 7. Customers - ลูกค้า

- [ ] ดูรายการลูกค้าได้
- [ ] เพิ่มลูกค้าใหม่ได้
- [ ] แก้ไขข้อมูลลูกค้าได้
- [ ] ดูประวัติการซื้อได้
- [ ] ดูแต้มสะสมได้

### 8. Discounts - ส่วนลด

- [ ] ดูรายการส่วนลดได้
- [ ] เพิ่มส่วนลดใหม่ได้
- [ ] แก้ไขส่วนลดได้
- [ ] ลบส่วนลดได้
- [ ] ส่วนลดทำงานตามเงื่อนไข

### 9. Reports - รายงาน

- [ ] ดูยอดขายรายวันได้
- [ ] ดูยอดขายตามช่วงเวลาได้
- [ ] ดูรายงานกำไรได้
- [ ] กรองตามวิธีชำระเงินได้
- [ ] Export CSV ได้

### 10. Dashboard

- [ ] แสดงยอดขายวันนี้ถูกต้อง
- [ ] แสดงกำไรวันนี้ถูกต้อง
- [ ] แสดงกราฟแนวโน้มยอดขาย
- [ ] แสดงสินค้าขายดี

### 11. Users - ผู้ใช้

- [ ] Login ด้วย PIN ได้
- [ ] Admin เข้าถึงทุกเมนูได้
- [ ] Cashier เข้าถึงเฉพาะเมนูที่อนุญาต
- [ ] Logout ได้

### 12. Offline Mode

- [ ] ขายสินค้าขณะ offline ได้
- [ ] Queue operations ขณะ offline
- [ ] Sync เมื่อกลับมา online
- [ ] แสดงสถานะ online/offline

### 13. PWA Features

- [ ] ติดตั้งเป็น app ได้
- [ ] ทำงานแบบ offline ได้
- [ ] รับ push notification ได้
- [ ] แสดง install prompt

### 14. Backup & Export

- [ ] Export ข้อมูลได้
- [ ] Import ข้อมูลได้
- [ ] สำรองข้อมูลได้

---

## Performance Testing

### Metrics to Monitor

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Bundle Size | < 500KB | Vite build |

### Performance Test Scenarios

1. **Load Testing**
   - Load 100+ products
   - Load 1000+ sales history
   - Filter/search with large dataset

2. **Stress Testing**
   - Rapid add/remove cart items
   - Multiple concurrent sales
   - Large offline queue sync

3. **Network Testing**
   - Slow 3G connection
   - Intermittent connectivity
   - Complete offline operation

### Running Lighthouse Audit

```bash
# Build production
npm run build

# Preview production build
npm run preview

# Run Lighthouse in Chrome DevTools
# 1. Open Chrome DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Select categories: Performance, PWA, Best Practices
# 4. Click "Analyze page load"
```

---

## Security Testing

### Authentication & Authorization

- [x] PIN-based authentication
- [x] Role-based access control (admin/cashier)
- [x] Protected routes
- [x] Session management

### Data Security

- [x] Supabase Row Level Security (RLS)
- [x] No sensitive data in localStorage (except cart)
- [x] HTTPS only in production
- [x] Input validation

### Security Checklist

- [ ] Test invalid PIN attempts
- [ ] Test unauthorized route access
- [ ] Test SQL injection in search
- [ ] Test XSS in product names
- [ ] Verify RLS policies work
- [ ] Check for exposed API keys

### OWASP Top 10 Considerations

| Risk | Mitigation |
|------|------------|
| Injection | Parameterized queries via Supabase |
| Broken Auth | PIN + role-based access |
| Sensitive Data | No PII stored locally |
| XXE | Not applicable (no XML) |
| Broken Access | Route guards + RLS |
| Security Misconfig | Environment variables |
| XSS | React auto-escaping |
| Insecure Deserialization | JSON only |
| Vulnerable Components | Regular npm audit |
| Insufficient Logging | Supabase logs |

---

## Test Coverage by Feature

| Feature | Property Tests | Integration Tests |
|---------|---------------|-------------------|
| Cart | ✅ 15 tests | ✅ 5 tests |
| Sales | ✅ 20 tests | ✅ included |
| Gas Cylinder | ✅ 18 tests | ✅ 4 tests |
| Payments | ✅ 17 tests | ✅ included |
| Discounts | ✅ 18 tests | - |
| Loyalty | ✅ 19 tests | - |
| Filters | ✅ 10 tests | ✅ 3 tests |
| Offline | ✅ 7 tests | ✅ 2 tests |
| Permissions | ✅ 15 tests | - |
| Stock | ✅ 12 tests | - |
| Reports | ✅ 14 tests | - |
| Product CRUD | ✅ 3 tests | - |

---

## Continuous Integration

### Recommended CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

---

*Last Updated: 29 November 2025*
