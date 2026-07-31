# Deployment Guide — GBDS অভিযোগ ও নিরাপত্তা পোর্টাল

আজই এই পোর্টাল লাইভ করার জন্য নিচের ধাপগুলো ক্রমান্বয়ে অনুসরণ করুন। মোট সময় লাগবে প্রায় ২০-৩০ মিনিট।

---

## অংশ ১: Google Apps Script Web App ডিপ্লয় করা

> এটি প্রথমে করতে হবে, কারণ এখান থেকে যে URL পাবেন, সেটি ফ্রন্টএন্ডে বসাতে হবে।

1. আগে **SHEET_SETUP_GUIDE.md** অনুসরণ করে Sheet + Apps Script তৈরি ও অনুমোদন সম্পন্ন করুন।
2. Apps Script এডিটরে উপরে ডান পাশে **Deploy → New deployment** ক্লিক করুন।
3. Gear/⚙️ আইকনে ক্লিক করে **Web app** নির্বাচন করুন।
4. নিচের সেটিংস দিন:
   - **Description**: `GBDS Complaint Portal v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone`  ⚠️ এটি অবশ্যই "Anyone" হতে হবে, নাহলে ফ্রন্টএন্ড থেকে সাবমিট করা যাবে না।
5. **Deploy** ক্লিক করুন।
6. আবার Permission অনুমোদন চাইতে পারে — আগের মতো Allow করুন।
7. ডিপ্লয় শেষে একটি **Web app URL** পাবেন, যা দেখতে এমন হবে:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   এই সম্পূর্ণ URL-টি কপি করে রাখুন।

### ভবিষ্যতে কোড পরিবর্তন করলে

Apps Script-এর কোডে কোনো পরিবর্তন করলে নতুন করে Deploy করতে হবে:
**Deploy → Manage deployments → ✏️ (Edit) → Version: "New version" → Deploy**

URL সাধারণত একই থাকে, তাই `script.js` ফাইল আবার পরিবর্তন করার দরকার হয় না।

---

## অংশ ২: ফ্রন্টএন্ডে Apps Script URL যুক্ত করা

1. প্রজেক্টের `script.js` ফাইলটি খুলুন।
2. একদম উপরের দিকে এই লাইনটি খুঁজুন:
   ```js
   GAS_WEB_APP_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
   ```
3. এটি পরিবর্তন করে আপনার কপি করা URL বসান:
   ```js
   GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
4. ফাইলটি Save করুন।

---

## অংশ ৩: হোস্টিং — Vercel (সুপারিশকৃত, দ্রুততম)

### Vercel Dashboard দিয়ে (কোনো কমান্ড লাইন লাগবে না)

1. [vercel.com](https://vercel.com) এ যান এবং GitHub দিয়ে সাইন-আপ/লগইন করুন।
2. **Add New → Project** ক্লিক করুন।
3. যদি প্রজেক্টটি এখনো GitHub-এ না থাকে:
   - [github.com/new](https://github.com/new) এ গিয়ে একটি নতুন রিপোজিটরি তৈরি করুন (যেমনঃ `gbds-complaint-portal`)।
   - এই ফোল্ডারের সব ফাইল (`index.html`, `script.js`) সেই রিপোজিটরিতে আপলোড করুন (GitHub-এর ওয়েব ইন্টারফেসে "Add file → Upload files" ব্যবহার করতে পারেন)।
4. Vercel-এ ফিরে এসে সেই রিপোজিটরিটি **Import** করুন।
5. Framework Preset: **Other** নির্বাচন করুন (এটি একটি স্ট্যাটিক সাইট, তাই কোনো Build Command লাগবে না)।
6. **Deploy** ক্লিক করুন।
7. কয়েক সেকেন্ডের মধ্যে একটি লাইভ URL পাবেন, যেমনঃ `https://gbds-complaint-portal.vercel.app`

---

## অংশ ৪: হোস্টিং — GitHub Pages (বিকল্প)

1. GitHub রিপোজিটরিতে `index.html` ও `script.js` আপলোড করুন (উপরের মতো)।
2. রিপোজিটরির **Settings → Pages** এ যান।
3. **Source** এর নিচে **Deploy from a branch** নির্বাচন করুন।
4. Branch: `main`, Folder: `/ (root)` নির্বাচন করে **Save** করুন।
5. ১-২ মিনিট পর আপনার সাইট লাইভ হবে এই ঠিকানায়:
   ```
   https://<your-username>.github.io/<repository-name>/
   ```

---

## অংশ ৫: চূড়ান্ত পরীক্ষা (আজকের ইভেন্টের আগে অবশ্যই করুন)

1. আপনার লাইভ URL-এ যান।
2. পুরো ফর্মটি ধাপে ধাপে পূরণ করে একটি টেস্ট অভিযোগ জমা দিন।
3. নিশ্চিত করুন যে:
   - ✅ Success পপআপে একটি Complaint ID দেখাচ্ছে (যেমনঃ `GBDS-2026-0001`)
   - ✅ Google Sheet-এ নতুন রো যুক্ত হয়েছে
   - ✅ `complain.gbds@gmail.com` এ ইমেইল পৌঁছেছে (Spam ফোল্ডারও চেক করুন)
   - ✅ প্রমাণ ফাইল আপলোড করলে Google Drive-এ ফোল্ডার তৈরি হয়েছে
4. মোবাইল ফোন থেকেও একবার টেস্ট করুন, যেহেতু ইভেন্টে অধিকাংশ অংশগ্রহণকারী মোবাইল থেকে ফর্ম পূরণ করবেন।
5. টেস্ট রো-টি Sheet থেকে মুছে ফেলুন যাতে আসল ডেটার সাথে মিশে না যায়।

---

## গুরুত্বপূর্ণ নিরাপত্তা নোট

- Apps Script "Who has access: Anyone" সেট করলেও, সাবমিট করা ডেটা শুধুমাত্র আপনার Google Sheet ও Drive-এ যায় — এটি পাবলিকলি ভিজিবল নয়।
- Evidence ফাইলগুলো "Anyone with the link can view" হিসেবে শেয়ার করা হয় (যাতে ইমেইল/Sheet থেকে লিংকে ক্লিক করলে দেখা যায়) — লিংকটি শুধুমাত্র যাদের কাছে Sheet/ইমেইল অ্যাক্সেস আছে তারাই পাবেন।
- Sheet ও Gmail অ্যাকাউন্টটি শুধুমাত্র বিশ্বস্ত কমিটি সদস্যদের সাথে শেয়ার করুন।
- প্রয়োজনে Google Sheet-এর **File → Share** থেকে অ্যাক্সেস নিয়ন্ত্রণ করুন।
