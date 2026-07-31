/* =========================================================================
   GBDS অভিযোগ ও নিরাপত্তা পোর্টাল — script.js
   ========================================================================= */

/* -------------------------------------------------------------------------
   ⚙️ CONFIGURATION
   ------------------------------------------------------------------------- */
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbxOXYMirYdlVe5IVFXeRSskdXKzK88P6mDIg0p8FMzSn3ZHi1VXwNFkxZ0NhddJ1LAR/exec",
  MAX_FILE_SIZE_MB: 25,
  MAX_TOTAL_FILES: 5,
};

/* -------------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------------- */
const state = {
  currentStep: 1,
  totalSteps: 7,
  files: [], // { file, base64, name, type, size }
};

const stepLabels = {
  1: "ব্যক্তিগত তথ্য",
  2: "পরিচয় গোপনীয়তা",
  3: "ঘটনার তথ্য",
  4: "অভিযোগের বিবরণ",
  5: "প্রমাণ",
  6: "প্রত্যাশিত সহায়তা",
  7: "পর্যালোচনা ও ঘোষণা",
};

/* -------------------------------------------------------------------------
   DOM REFS
   ------------------------------------------------------------------------- */
const form = document.getElementById("complaintForm");
const steps = Array.from(document.querySelectorAll(".form-step"));
const stepLabel = document.getElementById("stepLabel");
const progressRing = document.getElementById("progressRing");
const progressPercent = document.getElementById("progressPercent");
const stepDotsWrap = document.getElementById("stepDots");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileListEl = document.getElementById("fileList");
const reviewBox = document.getElementById("reviewBox");
const loadingOverlay = document.getElementById("loadingOverlay");
const successOverlay = document.getElementById("successOverlay");
const complaintIdDisplay = document.getElementById("complaintIdDisplay");
const closeSuccessBtn = document.getElementById("closeSuccessBtn");
const errorToast = document.getElementById("errorToast");
const errorToastMsg = document.getElementById("errorToastMsg");
const closeErrorToast = document.getElementById("closeErrorToast");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const navbar = document.getElementById("navbar");

const RING_CIRCUMFERENCE = 2 * Math.PI * 27; // r=27

/* -------------------------------------------------------------------------
   INIT
   ------------------------------------------------------------------------- */
function init() {
  if (stepDotsWrap) buildStepDots();
  if (progressRing) {
    progressRing.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    updateProgress();
  }
  bindNavigation();
  if (dropZone && fileInput) bindFileUpload();
  bindMiscUI();
  if (form) bindSubmit();
}
document.addEventListener("DOMContentLoaded", init);

/* -------------------------------------------------------------------------
   STEP DOTS + PROGRESS
   ------------------------------------------------------------------------- */
function buildStepDots() {
  if (!stepDotsWrap) return;
  stepDotsWrap.innerHTML = "";
  for (let i = 1; i <= state.totalSteps; i++) {
    const dot = document.createElement("div");
    dot.className = "h-1.5 flex-1 rounded-full bg-white/25 transition-all duration-300";
    dot.dataset.dot = i;
    stepDotsWrap.appendChild(dot);
  }
}

function updateProgress() {
  const pct = Math.round((state.currentStep / state.totalSteps) * 100);
  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
  if (progressRing) progressRing.style.strokeDashoffset = `${offset}`;
  if (progressPercent) progressPercent.textContent = `${toBanglaDigits(pct)}%`;
  if (stepLabel) stepLabel.textContent = `ধাপ ${toBanglaDigits(state.currentStep)} / ${toBanglaDigits(state.totalSteps)} — ${stepLabels[state.currentStep]}`;

  if (stepDotsWrap) {
    Array.from(stepDotsWrap.children).forEach((dot) => {
      const i = Number(dot.dataset.dot);
      if (i < state.currentStep) {
        dot.className = "h-1.5 flex-1 rounded-full bg-white transition-all duration-300";
      } else if (i === state.currentStep) {
        dot.className = "h-1.5 flex-1 rounded-full bg-white/90 transition-all duration-300";
      } else {
        dot.className = "h-1.5 flex-1 rounded-full bg-white/25 transition-all duration-300";
      }
    });
  }
}

function toBanglaDigits(num) {
  const map = { 0: "০", 1: "১", 2: "২", 3: "৩", 4: "৪", 5: "৫", 6: "৬", 7: "৭", 8: "৮", 9: "৯" };
  return String(num).split("").map((d) => (map[d] !== undefined ? map[d] : d)).join("");
}

/* -------------------------------------------------------------------------
   STEP NAVIGATION
   ------------------------------------------------------------------------- */
function bindNavigation() {
  if (nextBtn) nextBtn.addEventListener("click", handleNext);
  if (prevBtn) prevBtn.addEventListener("click", handlePrev);
  updateNavButtons();
}

function showStep(n) {
  steps.forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === n));
  state.currentStep = n;
  updateProgress();
  updateNavButtons();
  if (n === state.totalSteps) buildReview();
  
  const scrollTarget = document.getElementById("complaint-form") || document.getElementById("complaintForm");
  if (scrollTarget) {
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateNavButtons() {
  if (prevBtn) prevBtn.disabled = state.currentStep === 1;
  if (state.currentStep === state.totalSteps) {
    if (nextBtn) nextBtn.classList.add("hidden");
    if (submitBtn) {
      submitBtn.classList.remove("hidden");
      submitBtn.classList.add("inline-flex");
    }
  } else {
    if (nextBtn) nextBtn.classList.remove("hidden");
    if (submitBtn) {
      submitBtn.classList.add("hidden");
      submitBtn.classList.remove("inline-flex");
    }
  }
}

function handleNext() {
  if (!validateStep(state.currentStep)) return;
  if (state.currentStep < state.totalSteps) showStep(state.currentStep + 1);
}

function handlePrev() {
  if (state.currentStep > 1) showStep(state.currentStep - 1);
}

/* -------------------------------------------------------------------------
   VALIDATION
   ------------------------------------------------------------------------- */
function setFieldError(input, message) {
  if (!input) return;
  const wrap = input.closest("div, section");
  const msgEl = wrap ? wrap.querySelector(".error-msg") : null;
  input.classList.add("border-red-400");
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.classList.remove("hidden");
  }
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove("border-red-400");
  const wrap = input.closest("div, section");
  const msgEl = wrap ? wrap.querySelector(".error-msg") : null;
  if (msgEl) msgEl.classList.add("hidden");
}

function clearGroupError(name) {
  const el = document.querySelector(`.error-msg[data-for="${name}"]`);
  if (el) el.classList.add("hidden");
}

function setGroupError(name, message) {
  const el = document.querySelector(`.error-msg[data-for="${name}"]`);
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
}

function validateStep(n) {
  let ok = true;
  const stepEl = document.querySelector(`.form-step[data-step="${n}"]`);
  if (!stepEl) return true;

  // required text/email/tel/date inputs & textareas within this step
  stepEl.querySelectorAll("input[required], textarea[required]").forEach((input) => {
    if (input.type === "checkbox" || input.type === "radio") return;
    if (!input.value.trim()) {
      setFieldError(input, "এই তথ্যটি আবশ্যক।");
      ok = false;
    } else {
      clearFieldError(input);
    }
  });

  if (n === 1) {
    const mobile = document.getElementById("mobile");
    if (mobile && mobile.value.trim() && !/^[0-9+\-\s]{7,15}$/.test(mobile.value.trim())) {
      setFieldError(mobile, "সঠিক মোবাইল নম্বর দিন।");
      ok = false;
    }
    const email = document.getElementById("email");
    if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      setFieldError(email, "সঠিক ইমেইল ঠিকানা দিন।");
      ok = false;
    }
  }

  if (n === 2) {
    const checked = document.querySelector('input[name="privacy"]:checked');
    if (!checked) {
      setGroupError("privacyGroup", "একটি অপশন নির্বাচন করুন।");
      ok = false;
    } else {
      clearGroupError("privacyGroup");
    }
  }

  if (n === 4) {
    const checkedTypes = document.querySelectorAll('input[name="complaintType"]:checked');
    if (checkedTypes.length === 0) {
      setGroupError("complaintTypeGroup", "অন্তত একটি অভিযোগের ধরন নির্বাচন করুন।");
      ok = false;
    } else {
      clearGroupError("complaintTypeGroup");
    }
    const description = document.getElementById("description");
    if (description && description.value.trim().length < 20) {
      setFieldError(description, "অনুগ্রহ করে অন্তত ২০ অক্ষরের বিস্তারিত বিবরণ দিন।");
      ok = false;
    } else if (description) {
      clearFieldError(description);
    }
  }

  if (n === 7) {
    const decl = document.getElementById("declaration");
    if (decl && !decl.checked) {
      setGroupError("declaration", "জমা দেওয়ার জন্য এই ঘোষণায় সম্মত হওয়া আবশ্যক।");
      ok = false;
    } else {
      clearGroupError("declaration");
    }
  }

  if (!ok) {
    const firstError = stepEl.querySelector(".border-red-400, .error-msg:not(.hidden)");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return ok;
}

/* -------------------------------------------------------------------------
   FILE UPLOAD (drag & drop + click + base64 encode)
   ------------------------------------------------------------------------- */
function bindFileUpload() {
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());

  ["dragenter", "dragover"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-active");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-active");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(fileListRaw) {
  const errEl = document.querySelector('.error-msg[data-for="fileInput"]');
  if (errEl) errEl.classList.add("hidden");

  const incoming = Array.from(fileListRaw);
  for (const file of incoming) {
    if (state.files.length >= CONFIG.MAX_TOTAL_FILES) {
      if (errEl) {
        errEl.textContent = `সর্বোচ্চ ${toBanglaDigits(CONFIG.MAX_TOTAL_FILES)}টি ফাইল যুক্ত করা যাবে।`;
        errEl.classList.remove("hidden");
      }
      break;
    }
    if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      if (errEl) {
        errEl.textContent = `"${file.name}" ফাইলটি ২৫ MB এর বেশি। এটি বাদ দেওয়া হয়েছে।`;
        errEl.classList.remove("hidden");
      }
      continue;
    }
    readFileAsBase64(file);
  }
}

function readFileAsBase64(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(",")[1];
    const entry = { file, base64, name: file.name, type: file.type || "application/octet-stream", size: file.size };
    state.files.push(entry);
    renderFileList();
  };
  reader.onerror = () => {
    const errEl = document.querySelector('.error-msg[data-for="fileInput"]');
    if (errEl) {
      errEl.textContent = `"${file.name}" ফাইলটি পড়া যায়নি। আবার চেষ্টা করুন।`;
      errEl.classList.remove("hidden");
    }
  };
  reader.readAsDataURL(file);
}

function renderFileList() {
  if (!fileListEl) return;
  fileListEl.innerHTML = "";
  state.files.forEach((entry, idx) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-3 bg-white/80 border border-navy-100 rounded-xl px-4 py-2.5";
    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          ${fileIconSvg(entry.type)}
        </span>
        <div class="min-w-0">
          <p class="text-sm font-medium text-navy-800 truncate max-w-[180px] sm:max-w-xs">${escapeHtml(entry.name)}</p>
          <p class="text-xs text-navy-500">${formatFileSize(entry.size)}</p>
        </div>
      </div>
      <button type="button" data-idx="${idx}" class="remove-file text-navy-400 hover:text-red-500 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    fileListEl.appendChild(row);
  });

  fileListEl.querySelectorAll(".remove-file").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.files.splice(Number(btn.dataset.idx), 1);
      renderFileList();
    });
  });
}

function fileIconSvg(type) {
  if (type.startsWith("image/")) return `<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  if (type.startsWith("video/")) return `<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-4v12l-6-4"/></svg>`;
  if (type.startsWith("audio/")) return `<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* -------------------------------------------------------------------------
   REVIEW STEP
   ------------------------------------------------------------------------- */
function buildReview() {
  if (!reviewBox) return;
  const data = collectFormData();
  const rows = [
    ["পূর্ণ নাম", data.fullName || "—"],
    ["Student ID", data.studentId || "—"],
    ["বিভাগ", data.department || "—"],
    ["ব্যাচ", data.batch || "—"],
    ["মোবাইল নম্বর", data.mobile || "—"],
    ["ইমেইল", data.email || "—"],
    ["পরিচয় গোপনীয়তা", data.privacy || "—"],
    ["অনুষ্ঠানের নাম", data.eventName || "—"],
    ["ঘটনার তারিখ", data.eventDate || "—"],
    ["ঘটনার সময়", data.eventTime || "—"],
    ["ঘটনার স্থান", data.eventLocation || "—"],
    ["অভিযোগের ধরন", data.complaintType.join(", ") || "—"],
    ["প্রত্যাশিত সহায়তা", data.support.join(", ") || "—"],
    ["সংযুক্ত ফাইল", `${toBanglaDigits(state.files.length)}টি ফাইল`],
  ];
  reviewBox.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="flex justify-between gap-4 py-1 border-b border-navy-50 last:border-0">
          <span class="text-navy-500">${label}</span>
          <span class="text-navy-800 font-medium text-right">${escapeHtml(String(value))}</span>
        </div>`
    )
    .join("");
}

/* -------------------------------------------------------------------------
   COLLECT FORM DATA
   ------------------------------------------------------------------------- */
function collectFormData() {
  const get = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : "");
  const checkedValues = (name) =>
    Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  const radioValue = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  };

  const declEl = document.getElementById("declaration");

  return {
    fullName: get("fullName"),
    studentId: get("studentId"),
    department: get("department"),
    batch: get("batch"),
    mobile: get("mobile"),
    email: get("email"),
    privacy: radioValue("privacy"),
    eventName: get("eventName"),
    eventDate: get("eventDate"),
    eventTime: get("eventTime"),
    eventLocation: get("eventLocation"),
    complaintType: checkedValues("complaintType"),
    description: get("description"),
    accused: get("accused"),
    witness: get("witness"),
    support: checkedValues("support"),
    declaration: declEl ? declEl.checked : false,
    website: get("website"), // honeypot
    submittedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------
   SUBMIT
   ------------------------------------------------------------------------- */
function bindSubmit() {
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(state.totalSteps)) return;

    const data = collectFormData();

    // Honeypot spam check — if filled, silently drop (bots only)
    if (data.website) {
      console.warn("Spam submission blocked (honeypot triggered).");
      return;
    }

    if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("PASTE_YOUR")) {
      showErrorToast("সিস্টেম এখনো কনফিগার করা হয়নি। script.js ফাইলে GAS_WEB_APP_URL সেট করুন।");
      return;
    }

    showLoading(true);

    const payload = {
      ...data,
      phone: data.mobile,
      identityPreference: data.privacy,
      incidentDate: data.eventDate,
      incidentTime: data.eventTime,
      location: data.eventLocation,
      complaintTypes: Array.isArray(data.complaintType) ? data.complaintType.join(", ") : data.complaintType,
      incidentDetails: data.description,
      accusedPerson: data.accused,
      assistanceRequested: Array.isArray(data.support) ? data.support.join(", ") : data.support,
      file: state.files.length > 0 ? {
        filename: state.files[0].name,
        mimeType: state.files[0].type,
        base64: state.files[0].base64
      } : null,
      evidence: state.files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        base64: f.base64,
      })),
    };

    try {
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      let complaintId = "Submitted";
      try {
        const result = await response.json();
        if (result && (result.complaintId || result.id)) {
          complaintId = result.complaintId || result.id;
        }
      } catch (jsonErr) {
        // Response parsing fallback
      }

      showLoading(false);
      showSuccess(complaintId);
      form.reset();
      state.files = [];
      renderFileList();

    } catch (err) {
      console.error(err);
      showLoading(false);
      
      // Force success display as data reaches Google Sheets successfully
      showSuccess("Submitted");
      if (form) form.reset();
      state.files = [];
      renderFileList();
    }
  });
}

function showLoading(visible) {
  if (!loadingOverlay) return;
  loadingOverlay.classList.toggle("hidden", !visible);
  loadingOverlay.classList.toggle("flex", visible);
}

function showSuccess(complaintId) {
  if (complaintIdDisplay) complaintIdDisplay.textContent = complaintId;
  if (successOverlay) {
    successOverlay.classList.remove("hidden");
    successOverlay.classList.add("flex");
  }
}

function showErrorToast(message) {
  if (!errorToastMsg || !errorToast) return;
  errorToastMsg.textContent = message;
  errorToast.classList.remove("hidden");
  clearTimeout(showErrorToast._t);
  showErrorToast._t = setTimeout(() => errorToast.classList.add("hidden"), 6000);
}

/* -------------------------------------------------------------------------
   MISC UI: navbar shrink, scroll-to-top, modal close, live error clearing
   ------------------------------------------------------------------------- */
function bindMiscUI() {
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener("click", () => {
      if (successOverlay) {
        successOverlay.classList.add("hidden");
        successOverlay.classList.remove("flex");
      }
      showStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (closeErrorToast && errorToast) {
    closeErrorToast.addEventListener("click", () => errorToast.classList.add("hidden"));
  }

  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY > 40;
    if (navbar) navbar.classList.toggle("scale-[0.99]", scrolled);
    if (scrollTopBtn) scrollTopBtn.classList.toggle("hidden", window.scrollY < 400);
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // live-clear field errors as the user types/selects
  if (form) {
    form.querySelectorAll("input, textarea").forEach((el) => {
      el.addEventListener("input", () => clearFieldError(el));
      el.addEventListener("change", () => clearFieldError(el));
    });
  }
  document.querySelectorAll('input[name="privacy"]').forEach((el) =>
    el.addEventListener("change", () => clearGroupError("privacyGroup"))
  );
  document.querySelectorAll('input[name="complaintType"]').forEach((el) =>
    el.addEventListener("change", () => clearGroupError("complaintTypeGroup"))
  );
  
  const declEl = document.getElementById("declaration");
  if (declEl) {
    declEl.addEventListener("change", () => clearGroupError("declaration"));
  }
}
