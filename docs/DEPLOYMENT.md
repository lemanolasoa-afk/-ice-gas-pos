# Deployment Guide - Ice Gas POS

## Overview

ระบบ Ice Gas POS เป็น PWA (Progressive Web App) ที่สามารถ deploy ได้หลายแพลตฟอร์ม:
- ✅ Vercel (แนะนำ)
- ✅ Netlify
- ✅ Cloudflare Pages
- ✅ GitHub Pages

---

## Prerequisites

1. **Supabase Project** - ต้องมี project พร้อมใช้งาน
2. **Environment Variables** - ต้องตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY
3. **Node.js 18+** - สำหรับ build

---

## 1. Vercel Deployment (แนะนำ)

### 1.1 Deploy ผ่าน Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd ice-gas-pos
vercel
```

### 1.2 Deploy ผ่าน GitHub

1. Push code ไปยัง GitHub repository
2. ไปที่ [vercel.com](https://vercel.com)
3. Import project จาก GitHub
4. ตั้งค่า:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. เพิ่ม Environment Variables:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxx
   ```
6. Deploy

### 1.3 Vercel Configuration

สร้างไฟล์ `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

---

## 2. Netlify Deployment

### 2.1 Configuration

ไฟล์ `netlify.toml` (มีอยู่แล้ว):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2.2 Deploy

1. Push code ไปยัง GitHub
2. ไปที่ [netlify.com](https://netlify.com)
3. New site from Git
4. เลือก repository
5. ตั้งค่า Environment Variables
6. Deploy

---

## 3. Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_NAME` | App name | `ICE POS` |
| `VITE_VAPID_PUBLIC_KEY` | Push notification key | - |

### Setting Environment Variables

**Vercel:**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

**Netlify:**
- Site settings > Build & deploy > Environment

---

## 4. Supabase Configuration

### 4.1 Edge Functions Secrets

ตั้งค่าใน Supabase Dashboard > Edge Functions > Secrets:

```
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:your-email@example.com
```

### 4.2 Row Level Security (RLS)

ตรวจสอบว่า RLS policies ถูกต้อง:

```sql
-- ตรวจสอบ RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 4.3 Database Backup

ตั้งค่า automatic backup ใน Supabase Dashboard:
- Settings > Database > Backups
- เปิด Point-in-time Recovery (Pro plan)

---

## 5. Post-Deployment Checklist

### 5.1 Verify Deployment

- [ ] เปิดเว็บไซต์ได้
- [ ] Login ได้
- [ ] ขายสินค้าได้
- [ ] ข้อมูลบันทึกลง database
- [ ] PWA install ได้
- [ ] Offline mode ทำงาน

### 5.2 Performance Check

```bash
# Run Lighthouse audit
npx lighthouse https://your-domain.com --view
```

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: ✅

### 5.3 Security Check

- [ ] HTTPS enabled
- [ ] Environment variables ไม่ expose
- [ ] RLS policies active
- [ ] CORS configured correctly

---

## 6. Monitoring

### 6.1 Vercel Analytics

เปิดใช้งานใน Vercel Dashboard:
- Project > Analytics > Enable

### 6.2 Supabase Monitoring

ดูได้ใน Supabase Dashboard:
- Database > Reports
- Edge Functions > Logs
- Auth > Users

### 6.3 Error Tracking (Optional)

เพิ่ม Sentry สำหรับ error tracking:

```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});
```

---

## 7. Backup Schedule

### 7.1 Automatic Backups

Supabase Pro plan มี automatic daily backups

### 7.2 Manual Backup Script

```bash
# Export data
npx supabase db dump -f backup.sql --project-ref YOUR_PROJECT_REF
```

### 7.3 Recommended Schedule

| Data | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 30 days |
| Edge Functions | On change | Git history |
| Environment | On change | Secure storage |

---

## 8. Rollback Plan

### 8.1 Vercel Rollback

1. ไปที่ Vercel Dashboard
2. Deployments
3. เลือก deployment ก่อนหน้า
4. Click "..." > "Promote to Production"

### 8.2 Database Rollback

```sql
-- Point-in-time recovery (Pro plan)
-- ติดต่อ Supabase support

-- หรือ restore จาก backup
psql -h YOUR_HOST -U postgres -d postgres < backup.sql
```

### 8.3 Emergency Contacts

- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.io
- Developer: [your-email]

---

## 9. Domain Setup (Optional)

### 9.1 Custom Domain on Vercel

1. Project Settings > Domains
2. Add domain
3. Update DNS records:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

### 9.2 SSL Certificate

Vercel และ Netlify ให้ SSL certificate ฟรีอัตโนมัติ

---

## Quick Commands

```bash
# Build locally
npm run build

# Preview build
npm run preview

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls
```

---

*Last Updated: 29 November 2025*
