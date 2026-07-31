# GBDS অভিযোগ ও নিরাপত্তা পোর্টাল

Gono Bishwabidyalay Debate Society (GBDS)-এর জন্য একটি সম্পূর্ণ, নিরাপদ ও আধুনিক অভিযোগ দাখিলের পোর্টাল। কোনো Paid Service ছাড়াই তৈরি — শুধুমাত্র Google Sheets, Google Apps Script, এবং একটি ফ্রি স্ট্যাটিক হোস্টিং (Vercel / GitHub Pages) ব্যবহার করে।

## ফোল্ডার স্ট্রাকচার

```
gbds-complaint-portal/
├── index.html                        # মূল ওয়েবসাইট (Hero + ৭-ধাপের ফর্ম + ফুটার)
├── script.js                         # ফর্ম লজিক, ভ্যালিডেশন, ফাইল আপলোড, API কল
├── Code.gs                           # Google Apps Script ব্যাকএন্ড
├── assets/                           # লোগো ও favicon (সব সাইজ)
│   ├── gbds-logo.png                 # হেডার/ফুটারে ব্যবহৃত মূল লোগো
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
├── .gitignore                        # Git-এ যা ট্র্যাক করা হবে না
├── vercel.json                       # Vercel স্ট্যাটিক ডিপ্লয়মেন্ট কনফিগ
├── SHEET_SETUP_GUIDE.md              # Google Sheet + Apps Script সেটআপ নির্দেশিকা
├── DEPLOYMENT_GUIDE.md               # ডিপ্লয়মেন্ট নির্দেশিকা (Vercel / GitHub Pages)
└── README.md                         # এই ফাইল
```

> **নোট:** সব ফন্ট (Hind Siliguri, Baloo Da 2) Google Fonts CDN থেকে লোড হয়, তাই আলাদা `fonts/` ফোল্ডারের প্রয়োজন নেই। সব ছবি/আইকন `assets/` ফোল্ডারে রাখা আছে, তাই আলাদা `images/` ফোল্ডারও প্রয়োজন নেই।

## দ্রুত শুরু (৩ ধাপ)

1. **ব্যাকএন্ড সেটআপ** → `SHEET_SETUP_GUIDE.md` অনুসরণ করে Google Sheet ও Apps Script তৈরি করুন।
2. **ডিপ্লয় ও কনফিগার** → `DEPLOYMENT_GUIDE.md` অনুসরণ করে Apps Script Web App ডিপ্লয় করুন, URL কপি করে `script.js`-এর `CONFIG.GAS_WEB_APP_URL` এ বসান।
3. **হোস্ট করুন** → `index.html` ও `script.js` Vercel অথবা GitHub Pages-এ আপলোড করুন। ব্যস, পোর্টাল লাইভ!

## বৈশিষ্ট্য

- **৭-ধাপের গাইডেড ফর্ম** — প্রগ্রেস রিং ও স্টেপ ইন্ডিকেটরসহ, মোবাইল-ফার্স্ট ডিজাইন
- **সম্পূর্ণ বাংলা ইন্টারফেস** — Hind Siliguri ও Baloo Da 2 ফন্ট, UTF-8
- **পরিচয় গোপনীয়তার ৩টি স্তর** — ব্যবহারকারী নিজেই নিয়ন্ত্রণ করতে পারেন
- **ড্র্যাগ-অ্যান্ড-ড্রপ ফাইল আপলোড** — ছবি/ভিডিও/অডিও/PDF, সর্বোচ্চ ২৫ MB প্রতি ফাইল
- **স্বয়ংক্রিয় Complaint ID** — `GBDS-2026-0001` ফরম্যাটে, প্রতি বছর রিসেট হয়
- **Google Sheets-এ সংরক্ষণ** — কোনো ডেটাবেজ সেটআপ ছাড়াই
- **Google Drive-এ Evidence সংরক্ষণ** — প্রতিটি অভিযোগের জন্য আলাদা ফোল্ডার
- **স্বয়ংক্রিয় HTML ইমেইল নোটিফিকেশন** — `complain.gbds@gmail.com` এ
- **স্প্যাম প্রোটেকশন** — Honeypot ফিল্ড (ক্লায়েন্ট + সার্ভার উভয় পাশে)
- **গ্লাসমরফিজম UI** — নীল-সাদা থিম, স্মুথ অ্যানিমেশন, রেসপনসিভ

## টেকনোলজি স্ট্যাক

| স্তর | প্রযুক্তি |
|---|---|
| Frontend | HTML5, Tailwind CSS (CDN), Vanilla JavaScript |
| Backend | Google Apps Script |
| Database | Google Sheets |
| File Storage | Google Drive |
| Email | Gmail (MailApp) |
| Hosting | Vercel / GitHub Pages |

## কনফিগারেশন

`script.js`-এর একদম উপরে একটি `CONFIG` অবজেক্ট আছে:

```js
const CONFIG = {
  GAS_WEB_APP_URL: "...",   // আপনার Apps Script Web App URL
  MAX_FILE_SIZE_MB: 25,      // প্রতি ফাইলের সর্বোচ্চ সাইজ
  MAX_TOTAL_FILES: 5,        // সর্বোচ্চ ফাইল সংখ্যা
};
```

`Code.gs`-এর উপরে আছে:

```js
const NOTIFY_EMAIL = "complain.gbds@gmail.com";
const SHEET_NAME = "Complaints";
const DRIVE_FOLDER_NAME = "GBDS Complaint Evidence";
```

## সাপোর্ট

কারিগরি সমস্যা হলে `DEPLOYMENT_GUIDE.md` ও `SHEET_SETUP_GUIDE.md`-এর Troubleshooting অংশ দেখুন।

---

**Developed by** Mushfiqur Rahman ([LinkedIn](https://www.linkedin.com/in/mushfique99)) · **Powered by** G-TabX

© ২০২৬ Gono Bishwabidyalay Debate Society (GBDS)
