# نظام صيدليتي - إدارة المخزون

تطبيق Next.js لإدارة مخزون الصيدلية والمبيعات والمشتريات والعملاء والموردين والتقارير، مع اتصال بقاعدة بيانات Supabase.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
# عدّل .env.local وضع بيانات مشروع Supabase
npm run dev
```

افتح http://localhost:3000.

## النشر على GitHub وVercel

1. أنشئ مستودعًا جديدًا على GitHub.
2. من مجلد المشروع نفّذ:

```bash
npm install
git init
git add .
git commit -m "Prepare pharmacy app for deployment"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

3. افتح [Vercel](https://vercel.com)، اختر **Add New Project** ثم استورد مستودع GitHub.
4. اترك إعدادات البناء الافتراضية لـ Next.js؛ سيستخدم Vercel تلقائيًا:
   - Build Command: `next build`
   - Install Command: `npm install`
   - Output: إعداد Next.js الافتراضي
5. من **Project Settings → Environment Variables** أضف المتغيرين التاليين لكل بيئة تحتاجها (Production وPreview وDevelopment):

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

6. اضغط **Redeploy** بعد حفظ المتغيرات.

> لا ترفع ملف `.env.local` إلى GitHub. الملف موجود في `.gitignore`، والقالب الآمن الموجود هو `.env.example`.

## الصفحات

- لوحة التحكم: إحصائيات وروابط إلى التقارير المفلترة.
- المخزن: إضافة وتعديل وحذف الأدوية مع البحث والتنبيه عند انخفاض الكمية.
- البيع: تسجيل عملية بيع وخصمها من المخزون.
- الشراء: تسجيل عملية شراء وإضافتها إلى المخزون.
- العملاء والموردون: إدارة البيانات وكشوف الأصناف والطباعة.
- التقارير: فلترة وطباعة وتحميل Excel.

## فحص ما قبل النشر

```bash
npm run build
```

تم اختبار المشروع بنجاح باستخدام Next.js 14 والإعدادات الحالية.
