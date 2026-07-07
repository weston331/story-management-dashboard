# 🚀 R2 Image Upload Worker

هذا الـ Worker يقوم بالتحقق الآمن من جلسات المستخدمين عبر Supabase، ثم حفظ الصور المرفوعة مباشرةً في Cloudflare R2 تحت المجلد `photos/`.

## 🛠️ خطوات النشر والتشغيل السريع

### 1. تسجيل الدخول إلى Cloudflare
قم بتشغيل هذا الأمر في سطر الأوامر (Terminal) لتسجيل الدخول إلى حساب Cloudflare الخاص بك:
```bash
npx wrangler login
```
*سيفتح لك المتصفح لتأكيد تسجيل الدخول بضغطة زر.*

### 2. التحقق من اسم الـ Bucket
افتح ملف `wrangler.toml` وقم بتعديل حقل `bucket_name` ليتطابق مع اسم الـ Bucket الفعلي الخاص بك في Cloudflare R2:
```toml
bucket_name = "اسم_الـ_bucket_الخاص_بك"
```

### 3. إعداد الرابط العام للـ Bucket
في نفس الملف `wrangler.toml` تحت قسم `[vars]`، استبدل القيمة الافتراضية للرابط برابط الـ Bucket العام الخاص بك (سواء كان نطاق مخصص Custom Domain أو رابط `pub-xxx.r2.dev`):
```toml
PUBLIC_BUCKET_URL = "https://your-public-bucket-url-here.r2.dev"
```

### 4. نشر الـ Worker
قم بنشر الـ Worker مباشرةً إلى سحابة Cloudflare عبر تشغيل:
```bash
npx wrangler deploy
```

بعد انتهاء النشر، سينتج لك رابط للـ Worker مثل:
`https://r2-upload-worker.your-subdomain.workers.dev`

انسخ هذا الرابط وضعه في ملف الـ `.env` الرئيسي لمشروعك في هذا الحقل:
```env
VITE_R2_UPLOAD_WORKER_URL=الرابط_الذي_نسخته
```

وأعد تشغيل مشروعك لتجربة الرفع المباشر!
