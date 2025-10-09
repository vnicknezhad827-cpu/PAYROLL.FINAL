// =================================================================================
// PAYROLL & AD-HOC PAYMENTS MANAGEMENT SYSTEM
// نسخه کامل و تست‌شده
// =================================================================================

// ========== SECTION 1: GLOBAL STATE ==========
let globalMonthlyData = [];      // داده‌های حقوق و مزایا
let globalAdHocData = [];        // داده‌های پرداخت‌های موردی
let limitsByLevel = {};
let charts = {};
let currentFilteredSalaryData = [];
let currentFilteredAdHocData = [];
let currentSalarySort = { key: null, direction: 'asc' };
let currentAdHocSort = { key: null, direction: 'asc' };
let employeeProfiles = {};
let dossierChartInstance = null;
let companyList = [];
let paymentTypes = [];
let mappingProfiles = {};
let currentFile = null;
let currentFileHeaders = [];
let currentFileType = 'salary';  // 'salary' or 'adhoc'
let currentNoteKey = null;
let conflictList = [];

// ========== SECTION 2: CONSTANTS & UTILITIES ==========
const monthsMap = {
    "فروردین": 1, "اردیبهشت": 2, "خرداد": 3, "تیر": 4, "مرداد": 5, "شهریور": 6,
    "مهر": 7, "آبان": 8, "آذر": 9, "دی": 10, "بهمن": 11, "اسفند": 12
};

const limitsHeaderMap = {
    "سطح": "level",
    "سقف حقوق پایه (30 روزه)": "limit_base_30",
    "سقف حقوق و مزایای قانونی": "limit_allowance",
    "سقف کارانه": "limit_bonus",
    "سقف خالص پرداختی بدون ماموریت": "limit_net_no_mission",
    "سقف خالص پرداختی با ماموریت": "limit_net_with_mission"
};

const SYSTEM_FIELDS = {
    fname: { label: "نام", required: true, group: 'شناسایی', multiple: false },
    lname: { label: "نام خانوادگی", required: true, group: 'شناسایی', multiple: false },
    semat: { label: "سمت", required: false, group: 'شناسایی', multiple: false },
    level: { label: "سطح", required: false, group: 'شناسایی', multiple: false },
    base_pay: { label: "حقوق پایه (و اجزای آن)", required: true, group: 'اجزای حقوق', multiple: true },
    housing: { label: "حق مسکن", required: false, group: 'اجزای حقوق', multiple: false },
    children: { label: "حق اولاد", required: false, group: 'اجزای حقوق', multiple: false },
    worker_bonus: { label: "بن کارگری", required: false, group: 'اجزای حقوق', multiple: false },
    seniority: { label: "پایه سنوات", required: false, group: 'اجزای حقوق', multiple: false },
    marital: { label: "حق تاهل", required: false, group: 'اجزای حقوق', multiple: false },
    overtime: { label: "اضافه کار", required: false, group: 'پرداختی‌ها', multiple: true },
    shift_pay: { label: "حق شیفت", required: false, group: 'پرداختی‌ها', multiple: true },
    bonus: { label: "کارانه/پاداش", required: false, group: 'پرداختی‌ها', multiple: true },
    transportation: { label: "ایاب و ذهاب", required: false, group: 'پرداختی‌ها', multiple: true },
    food_allowance: { label: "حق غذا", required: false, group: 'پرداختی‌ها', multiple: true },
    mission: { label: "مأموریت", required: false, group: 'پرداختی‌ها', multiple: true },
    other_payment: { label: 'سایر پرداخت‌ها', required: false, group: 'سایر موارد', multiple: true },
    deduction_insurance: { label: "بیمه", required: true, group: 'کسورات', multiple: false },
    deduction_tax: { label: "مالیات", required: true, group: 'کسورات', multiple: false },
    other_deduction: { label: 'سایر کسورات', required: false, group: 'سایر موارد', multiple: true },
};

const iconPencil = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;
const iconComment = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>`;

// Utility Functions
const showLoading = (message = 'در حال پردازش...') => {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('p').textContent = message;
    overlay.style.display = 'flex';
};

const hideLoading = () => {
    document.getElementById('loadingOverlay').style.display = 'none';
};

const formatPersianNumber = (num) => {
    return (num === null || num === undefined) ? '-' : Math.round(num).toLocaleString('fa-IR');
};

const normalizeText = (str) => {
    return str ? str.toString().trim()
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, " ")
        .replace(/\u200C/g, "")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .toLowerCase() : "";
};
/**
 * فرمت‌دهی عدد با کاما (جداکننده هزارگان)
 * @param {string|number} value 
 * @returns {string}
 */
function formatNumberWithComma(value) {
    if (!value) return '';
    // حذف تمام کاراکترهای غیرعددی
    const numericValue = value.toString().replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    // اضافه کردن کاما
    return parseInt(numericValue).toLocaleString('en-US');
}

/**
 * حذف کاما و تبدیل به عدد
 * @param {string} value 
 * @returns {number}
 */
function parseNumberWithComma(value) {
    if (!value) return 0;
    return parseInt(value.toString().replace(/,/g, '')) || 0;
}

/**
 * اعمال فرمت real-time به input
 * @param {HTMLInputElement} input 
 */
function applyNumberFormatting(input) {
    if (!input) return;
    
    // رویداد input برای فرمت‌دهی real-time
    input.addEventListener('input', function(e) {
        const cursorPosition = this.selectionStart;
        const oldValue = this.value;
        const oldLength = oldValue.length;
        
        // فرمت‌دهی
        const formatted = formatNumberWithComma(this.value);
        this.value = formatted;
        
        // تنظیم مجدد موقعیت cursor
        const newLength = formatted.length;
        const diff = newLength - oldLength;
        this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
    });
    
    // رویداد blur برای اطمینان از فرمت صحیح
    input.addEventListener('blur', function() {
        this.value = formatNumberWithComma(this.value);
    });
    
    // رویداد focus برای انتخاب راحت‌تر
    input.addEventListener('focus', function() {
        // اختیاری: می‌توانید input را select کنید
        // this.select();
    });
}

function getNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const num = parseFloat(String(value).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

function normalizeKeys(row, map) {
    const newRow = {};
    for (let key in row) {
        if (!key) continue;
        let cleanKey = key.trim();
        const mapKey = map[cleanKey] || cleanKey;
        newRow[mapKey] = row[key];
    }
    return newRow;
}
// ========== ADD TO SECTION 2: UTILITIES (بعد از getNumber) ==========

/**
 * تبدیل تاریخ میلادی به شمسی
 * @param {Date} gDate - تاریخ میلادی
 * @returns {Object} - {year, month, day}
 */
function gregorianToShamsi(gDate) {
    if (!gDate) gDate = new Date();
    
    const gYear = gDate.getFullYear();
    const gMonth = gDate.getMonth() + 1;
    const gDay = gDate.getDate();
    
    let jYear, jMonth, jDay;
    
    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    let gy = gYear - 1600;
    let gm = gMonth - 1;
    let gd = gDay - 1;
    
    let gDayNo = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
    
    for (let i = 0; i < gm; ++i) {
        gDayNo += gDaysInMonth[i];
    }
    
    if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0))) {
        gDayNo++;
    }
    
    gDayNo += gd;
    
    let jDayNo = gDayNo - 79;
    
    let jNp = Math.floor(jDayNo / 12053);
    jDayNo = jDayNo % 12053;
    
    jYear = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
    jDayNo %= 1461;
    
    if (jDayNo >= 366) {
        jYear += Math.floor((jDayNo - 1) / 365);
        jDayNo = (jDayNo - 1) % 365;
    }
    
    for (let i = 0; i < 11 && jDayNo >= jDaysInMonth[i]; ++i) {
        jDayNo -= jDaysInMonth[i];
        jMonth = i + 2;
    }
    
    if (jDayNo < 186) {
        jMonth = 1 + Math.floor(jDayNo / 31);
        jDay = 1 + (jDayNo % 31);
    } else {
        jMonth = 7 + Math.floor((jDayNo - 186) / 30);
        jDay = 1 + ((jDayNo - 186) % 30);
    }
    
    return { year: jYear, month: jMonth, day: jDay };
}

/**
 * دریافت سال شمسی جاری
 */
function getCurrentShamsiYear() {
    return gregorianToShamsi(new Date()).year;
}

/**
 * تولید لیست سال‌های شمسی
 * @param {number} startOffset - چند سال قبل (مثلا 10)
 * @param {number} endOffset - چند سال بعد (مثلا 2)
 */
function generateShamsiYears(startOffset = 10, endOffset = 2) {
    const currentYear = getCurrentShamsiYear();
    const years = [];
    for (let i = currentYear - startOffset; i <= currentYear + endOffset; i++) {
        years.push(i);
    }
    return years;
}
// ========== SECTION 3: APP LIFECYCLE ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadDataFromStorage();
});

function initializeApp(hasData) {
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const dataDependentElements = document.querySelectorAll('.tabs, #tab-salary, #tab-adhoc, #tab-reports');
    const exportBtn = document.getElementById('exportDataBtn').parentElement;
    const clearBtn = document.getElementById('clearDataBtn').parentElement;

    if (hasData && (globalMonthlyData.length > 0 || globalAdHocData.length > 0)) {
        employeeProfiles = buildEmployeeProfiles(globalMonthlyData, globalAdHocData);
        welcomeOverlay.style.display = 'none';
        dataDependentElements.forEach(el => el.classList.remove('hidden'));
        exportBtn.style.display = 'block';
        clearBtn.style.display = 'block';

        populateSalaryFilters(globalMonthlyData);
        populateAdHocFilters(globalAdHocData);

        applySalaryFilters();
        applyAdHocFilters();

        buildCharts(globalMonthlyData);
        updateKpiCards(globalMonthlyData);

        showTab('salary');
    } else {
        welcomeOverlay.style.display = 'flex';
        dataDependentElements.forEach(el => el.classList.add('hidden'));
        exportBtn.style.display = 'none';
        clearBtn.style.display = 'none';
    }
}

function loadDataFromStorage() {
    globalMonthlyData = JSON.parse(localStorage.getItem('payrollData_v4') || '[]');
    globalAdHocData = JSON.parse(localStorage.getItem('adHocData_v4') || '[]');
    limitsByLevel = JSON.parse(localStorage.getItem('payrollLimits_v4') || '{}');
    companyList = JSON.parse(localStorage.getItem('companyList_v4') || '[]');
    paymentTypes = JSON.parse(localStorage.getItem('paymentTypes_v4') || '["حق حضور", "پاداش عملکرد", "پاداش هیئت مدیره", "حق جلسه", "سایر"]');
    mappingProfiles = JSON.parse(localStorage.getItem('mappingProfiles_v4') || '{}');
    initializeApp(globalMonthlyData.length > 0 || globalAdHocData.length > 0);
}

function saveDataToStorage() {
    try {
        localStorage.setItem('payrollData_v4', JSON.stringify(globalMonthlyData));
        localStorage.setItem('adHocData_v4', JSON.stringify(globalAdHocData));
        localStorage.setItem('payrollLimits_v4', JSON.stringify(limitsByLevel));
        localStorage.setItem('companyList_v4', JSON.stringify(companyList));
        localStorage.setItem('paymentTypes_v4', JSON.stringify(paymentTypes));
        localStorage.setItem('mappingProfiles_v4', JSON.stringify(mappingProfiles));
    } catch (e) {
        console.error("Error saving to localStorage:", e);
        alert("خطا در ذخیره‌سازی داده‌ها.");
    }
}

function clearStoredData() {
    if (confirm("آیا از پاک کردن تمام داده‌های ذخیره شده مطمئن هستید؟")) {
        localStorage.clear();
        window.location.reload();
    }
}

// ========== SECTION 4: TAB MANAGEMENT ==========
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(div => div.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + tabId).classList.add('active');
}

// ========== SECTION 5: SALARY TAB ==========
function populateSalaryFilters(data) {
    const populate = (selectId, options) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">همه</option>';
        for (const opt of options) {
            if (opt) select.innerHTML += `<option value="${opt}">${opt}</option>`;
        }
    };
    populate('filterSalaryCompany', [...new Set(data.map(item => item.company))].sort());
    populate('filterSalaryLevel', [...new Set(data.map(item => item.level))].sort());
    populate('filterSalaryMonth', Object.keys(monthsMap).sort((a, b) => monthsMap[a] - monthsMap[b]));
}

function applySalaryFilters() {
    let filteredData = [...globalMonthlyData];
    const lnameFilter = document.getElementById('filterSalaryLname')?.value.trim().toLowerCase() || '';
    const companyFilter = document.getElementById('filterSalaryCompany')?.value || '';
    const levelFilter = document.getElementById('filterSalaryLevel')?.value || '';
    const monthFilter = document.getElementById('filterSalaryMonth')?.value || '';
    const selectedComplianceTypes = Array.from(document.querySelectorAll('#salaryComplianceDropdown .dropdown-item') || [])
        .filter(item => item.querySelector('input')?.checked)
        .map(item => item.dataset.value);

    if (lnameFilter) filteredData = filteredData.filter(emp => emp.lname && normalizeText(emp.lname).includes(lnameFilter));
    if (companyFilter) filteredData = filteredData.filter(emp => emp.company === companyFilter);
    if (levelFilter) filteredData = filteredData.filter(emp => emp.level === levelFilter);
    if (monthFilter) filteredData = filteredData.filter(emp => emp.month === monthFilter);
    if (selectedComplianceTypes.length > 0) {
        filteredData = filteredData.filter(emp => selectedComplianceTypes.every(type => isNonCompliant(emp, type)));
    }
    currentFilteredSalaryData = filteredData;
    sortAndRenderSalary();
}

function sortAndRenderSalary() {
    let dataToSort = [...currentFilteredSalaryData];
    if (currentSalarySort.key) {
        const direction = currentSalarySort.direction;
        dataToSort.sort((a, b) => {
            let valA = a[currentSalarySort.key], valB = b[currentSalarySort.key];
            if (currentSalarySort.key === 'month') {
                valA = monthsMap[valA] || 0;
                valB = monthsMap[valB] || 0;
            }
            let comparison = 0;
            const numA = (valA === null || valA === undefined) ? -Infinity : valA;
            const numB = (valB === null || valB === undefined) ? -Infinity : valB;
            if (typeof numA === 'number' && typeof numB === 'number') {
                comparison = numA - numB;
            } else {
                comparison = String(valA ?? '').localeCompare(String(valB ?? ''), 'fa');
            }
            return direction === 'asc' ? comparison : -comparison;
        });
    }
    updateSalarySortIndicators();
    renderSalaryTable(dataToSort);
}

function renderSalaryTable(dataToRender) {
    const tbody = document.querySelector("#salaryTable tbody");
    const recordCountSpan = document.getElementById('salaryRecordCount');
    if (!tbody || !recordCountSpan) return;

    tbody.innerHTML = "";
    recordCountSpan.textContent = `(نمایش ${dataToRender.length.toLocaleString("fa-IR")} از ${globalMonthlyData.length.toLocaleString("fa-IR")} رکورد)`;

    const fragment = document.createDocumentFragment();
    for (const emp of dataToRender) {
        const tr = document.createElement("tr");
        const limit = limitsByLevel[emp.level];
        const baseKey = `note_salary_${emp.key}_${emp.year}_${monthsMap[emp.month]}`;

        tr.innerHTML = [
            `<td class="sticky-col-1">${emp.year}</td>`,
            `<td class="sticky-col-2">${emp.month}</td>`,
            `<td class="sticky-col-3">${emp.company}</td>`,
            `<td class="sticky-col-4">${emp.fname}</td>`,
            `<td class="sticky-col-5"><a href="#" onclick="event.preventDefault(); openEmployeeDossier('${emp.key}')">${emp.lname}</a></td>`,
            `<td class="sticky-col-6">${emp.semat || '-'}</td>`,
            `<td>${emp.level || '-'}</td>`,
            `<td>${cellWithStatus(emp.base_pay_30, limit?.limit_base_30, `${baseKey}_base_pay`)}</td>`,
            `<td>${cellWithStatus(emp.allowance_30, limit?.limit_allowance, `${baseKey}_allowance`)}</td>`,
            `<td>${cellWithStatus(emp.bonus, limit?.limit_bonus, `${baseKey}_bonus`)}</td>`,
            `<td>${renderOvertimeHours(emp)}</td>`,
            `<td>${formatPersianNumber(emp.overtime_amount)}</td>`,
            `<td>${formatPersianNumber(emp.gross_no_mission)}</td>`,
            `<td>${formatPersianNumber(emp.gross_with_mission)}</td>`,
            `<td>${cellWithStatus(emp.net_no_mission, limit?.limit_net_no_mission, `${baseKey}_net_no`)}</td>`,
            `<td>${cellWithStatus(emp.net_with_mission, limit?.limit_net_with_mission, `${baseKey}_net_with`)}</td>`,
            `<td>${calcSalaryChange(emp)}</td>`
        ].join('');
        fragment.appendChild(tr);
    }
    tbody.appendChild(fragment);
}

function updateSalarySortIndicators() {
    document.querySelectorAll("#salaryTable thead th").forEach((th, index) => {
        th.classList.remove("sort-asc", "sort-desc");
        if (index < 6) th.classList.add(`sticky-col-${index + 1}`);
    });
    if (currentSalarySort.key) {
        const th = document.querySelector(`#salaryTable th[data-sort-key="${currentSalarySort.key}"]`);
        if (th) th.classList.add(currentSalarySort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

function sortSalaryTable(key) {
    if (currentSalarySort.key === key) {
        currentSalarySort.direction = currentSalarySort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSalarySort.key = key;
        currentSalarySort.direction = 'asc';
    }
    sortAndRenderSalary();
}

function resetSalaryFilters() {
    const elements = ['filterSalaryLname', 'filterSalaryCompany', 'filterSalaryLevel', 'filterSalaryMonth'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const complianceDropdown = document.getElementById('salaryComplianceDropdown');
    if (complianceDropdown) {
        complianceDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            const cb = item.querySelector('input');
            if (cb) cb.checked = false;
            item.classList.remove('selected');
        });
        updateSalaryComplianceFilterText();
    }
    currentSalarySort.key = null;
    currentSalarySort.direction = 'asc';
    applySalaryFilters();
}

function updateSalaryComplianceFilterText() {
    const complianceDropdown = document.getElementById('salaryComplianceDropdown');
    const complianceFilterBtn = document.getElementById('salaryComplianceFilterBtn');
    if (!complianceFilterBtn || !complianceDropdown) return;

    const selectedItems = Array.from(complianceDropdown.querySelectorAll('.dropdown-item'))
        .filter(item => item.querySelector('input')?.checked);
    const btnTextSpan = complianceFilterBtn.querySelector('span');

    if (selectedItems.length === 0) {
        btnTextSpan.textContent = 'انتخاب نوع تخطی...';
        complianceFilterBtn.classList.remove('has-selection');
    } else if (selectedItems.length <= 2) {
        btnTextSpan.textContent = selectedItems.map(item => item.querySelector('span').textContent).join('، ');
        complianceFilterBtn.classList.add('has-selection');
    } else {
        btnTextSpan.textContent = `${selectedItems.length} مورد انتخاب شده`;
        complianceFilterBtn.classList.add('has-selection');
    }
}

// ========== SECTION 6: AD-HOC PAYMENTS TAB ==========
function populateAdHocFilters(data) {
    const populate = (selectId, options) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">همه</option>';
        for (const opt of options) {
            if (opt) select.innerHTML += `<option value="${opt}">${opt}</option>`;
        }
    };
    populate('filterAdHocCompany', [...new Set(data.map(item => item.company))].sort());
    populate('filterAdHocType', [...new Set(data.map(item => item.payment_type))].sort());
    populate('filterAdHocMonth', Object.keys(monthsMap).sort((a, b) => monthsMap[a] - monthsMap[b]));
    
    // 🔥 تغییر: سال‌های شمسی به ترتیب نزولی
    const years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
    populate('filterAdHocYear', years);
}

function applyAdHocFilters() {
    let filteredData = [...globalAdHocData];
    const lnameFilter = document.getElementById('filterAdHocLname')?.value.trim().toLowerCase() || '';
    const companyFilter = document.getElementById('filterAdHocCompany')?.value || '';
    const typeFilter = document.getElementById('filterAdHocType')?.value || '';
    const monthFilter = document.getElementById('filterAdHocMonth')?.value || '';
    const yearFilter = document.getElementById('filterAdHocYear')?.value || '';

    if (lnameFilter) filteredData = filteredData.filter(emp => emp.lname && normalizeText(emp.lname).includes(lnameFilter));
    if (companyFilter) filteredData = filteredData.filter(emp => emp.company === companyFilter);
    if (typeFilter) filteredData = filteredData.filter(emp => emp.payment_type === typeFilter);
    if (monthFilter) filteredData = filteredData.filter(emp => emp.month === monthFilter);
    if (yearFilter) filteredData = filteredData.filter(emp => emp.year === parseInt(yearFilter));

    currentFilteredAdHocData = filteredData;
    sortAndRenderAdHoc();
}

function sortAndRenderAdHoc() {
    let dataToSort = [...currentFilteredAdHocData];
    if (currentAdHocSort.key) {
        const direction = currentAdHocSort.direction;
        dataToSort.sort((a, b) => {
            let valA = a[currentAdHocSort.key], valB = b[currentAdHocSort.key];
            if (currentAdHocSort.key === 'month') {
                valA = monthsMap[valA] || 0;
                valB = monthsMap[valB] || 0;
            }
            let comparison = 0;
            const numA = (valA === null || valA === undefined) ? -Infinity : valA;
            const numB = (valB === null || valB === undefined) ? -Infinity : valB;
            if (typeof numA === 'number' && typeof numB === 'number') {
                comparison = numA - numB;
            } else {
                comparison = String(valA ?? '').localeCompare(String(valB ?? ''), 'fa');
            }
            return direction === 'asc' ? comparison : -comparison;
        });
    }
    updateAdHocSortIndicators();
    renderAdHocTable(dataToSort);
}

function renderAdHocTable(dataToRender) {
    const tbody = document.querySelector("#adhocTable tbody");
    const recordCountSpan = document.getElementById('adhocRecordCount');
    if (!tbody || !recordCountSpan) return;

    tbody.innerHTML = "";
    recordCountSpan.textContent = `(نمایش ${dataToRender.length.toLocaleString("fa-IR")} از ${globalAdHocData.length.toLocaleString("fa-IR")} رکورد)`;

    const fragment = document.createDocumentFragment();
    for (const payment of dataToRender) {
        const tr = document.createElement("tr");
        const noteKey = `note_adhoc_${payment.key}_${payment.year}_${monthsMap[payment.month]}`;
        const noteText = localStorage.getItem(noteKey);

        tr.innerHTML = [
            `<td class="sticky-col-1">${payment.year}</td>`,
            `<td class="sticky-col-2">${payment.month}</td>`,
            `<td class="sticky-col-3">${payment.company}</td>`,
            `<td class="sticky-col-4">${payment.fname}</td>`,
            // 🔥 تغییر: استفاده از openEmployeeDossier
            `<td class="sticky-col-5"><a href="#" onclick="event.preventDefault(); openEmployeeDossier('${payment.key}')" style="color: #667EEA; font-weight: 600;">${payment.lname}</a></td>`,
            `<td>${payment.payment_type}</td>`,
            `<td class="amount">${formatPersianNumber(payment.amount)}</td>`,
            `<td><span class="note-icon" onclick="openNoteModal('${noteKey}')" title="${noteText || 'ثبت یادداشت'}">${noteText ? iconComment : iconPencil}</span></td>`,
            `<td><button class="btn-delete-adhoc" data-id="${payment.id}">حذف</button></td>`
        ].join('');
        fragment.appendChild(tr);
    }
    tbody.appendChild(fragment);

    tbody.querySelectorAll('.btn-delete-adhoc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (confirm('آیا از حذف این پرداخت اطمینان دارید؟')) {
                deleteAdHocPayment(id);
            }
        });
    });
}

function deleteAdHocPayment(id) {
    globalAdHocData = globalAdHocData.filter(p => p.id !== id);
    saveDataToStorage();
    
    // 🔥 جدید: به‌روزرسانی پروفایل‌ها
    employeeProfiles = buildEmployeeProfiles(globalMonthlyData, globalAdHocData);
    
    applyAdHocFilters();
    alert('پرداخت موردی با موفقیت حذف شد.');
}

function updateAdHocSortIndicators() {
    document.querySelectorAll("#adhocTable thead th").forEach((th, index) => {
        th.classList.remove("sort-asc", "sort-desc");
        if (index < 5) th.classList.add(`sticky-col-${index + 1}`);
    });
    if (currentAdHocSort.key) {
        const th = document.querySelector(`#adhocTable th[data-sort-key="${currentAdHocSort.key}"]`);
        if (th) th.classList.add(currentAdHocSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

function sortAdHocTable(key) {
    if (currentAdHocSort.key === key) {
        currentAdHocSort.direction = currentAdHocSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentAdHocSort.key = key;
        currentAdHocSort.direction = 'asc';
    }
    sortAndRenderAdHoc();
}

function resetAdHocFilters() {
    const elements = ['filterAdHocLname', 'filterAdHocCompany', 'filterAdHocType', 'filterAdHocMonth', 'filterAdHocYear'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    currentAdHocSort.key = null;
    currentAdHocSort.direction = 'asc';
    applyAdHocFilters();
}

// ========== REPLACE IN SECTION 7: AD-HOC PAYMENT MODAL ==========

function openSingleAdHocModal() {
    const companySelect = document.getElementById('adhocCompanySelect');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">انتخاب کنید...</option>';
        companyList.forEach(c => companySelect.innerHTML += `<option value="${c}">${c}</option>`);
    }

    const monthSelect = document.getElementById('adhocMonthSelect');
    if (monthSelect) {
        monthSelect.innerHTML = Object.keys(monthsMap).map(m => `<option value="${m}">${m}</option>`).join('');
    }

    const currentShamsiYear = getCurrentShamsiYear();
    const yearInput = document.getElementById('adhocYearSelect');
    if (yearInput) yearInput.value = currentShamsiYear;

    // پاک کردن فیلدها
    ['adhocFname', 'adhocLname', 'adhocDescription'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // 🔥 جدید: پاک کردن و فرمت‌دهی فیلد مبلغ
    const amountInput = document.getElementById('adhocAmount');
    if (amountInput) {
        amountInput.value = '';
        // اعمال فرمت‌دهی اگر قبلاً اعمال نشده
        if (!amountInput.dataset.formattingApplied) {
            applyNumberFormatting(amountInput);
            amountInput.dataset.formattingApplied = 'true';
        }
    }

    const typeSelect = document.getElementById('adhocTypeSelect');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">انتخاب کنید...</option>';
        paymentTypes.forEach(type => {
            typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });
    }

    const modal = document.getElementById('singleAdHocModal');
    if (modal) modal.style.display = 'block';
}

function closeSingleAdHocModal() {
    const modal = document.getElementById('singleAdHocModal');
    if (modal) modal.style.display = 'none';
}

function saveAdHocPayment() {
    const fname = document.getElementById('adhocFname')?.value.trim() || '';
    const lname = document.getElementById('adhocLname')?.value.trim() || '';
    const company = document.getElementById('adhocCompanySelect')?.value || '';
    const paymentType = document.getElementById('adhocTypeSelect')?.value || '';
    const month = document.getElementById('adhocMonthSelect')?.value || '';
    const year = parseInt(document.getElementById('adhocYearSelect')?.value) || 0;
    
    const amountInput = document.getElementById('adhocAmount');
    const amount = parseNumberWithComma(amountInput?.value) || 0;
    
    const description = document.getElementById('adhocDescription')?.value.trim() || '';

    // Validation
    if (!fname || !lname || !company || !paymentType || !month || !year || !amount) {
        alert('لطفا تمام فیلدهای الزامی را پر کنید.');
        return;
    }

    if (amount <= 0) {
        alert('مبلغ باید بزرگتر از صفر باشد.');
        return;
    }

    const newPayment = {
        id: Date.now().toString(),
        fname,
        lname,
        company,
        payment_type: paymentType,
        month,
        year,
        amount,
        description,
        key: `${normalizeText(company)}-${normalizeText(fname)}-${normalizeText(lname)}`
    };

    globalAdHocData.push(newPayment);
    saveDataToStorage();
    
    // 🔥 جدید: به‌روزرسانی پروفایل‌ها
    employeeProfiles = buildEmployeeProfiles(globalMonthlyData, globalAdHocData);
    
    closeSingleAdHocModal();

    populateAdHocFilters(globalAdHocData);
    applyAdHocFilters();

    alert('پرداخت موردی با موفقیت ثبت شد.');
}

function addNewAdHocCompany() {
    const newName = prompt("لطفا نام شرکت جدید را وارد کنید:");
    if (newName && newName.trim()) {
        const trimmed = newName.trim();
        if (!companyList.includes(trimmed)) {
            companyList.push(trimmed);
            companyList.sort();
            saveDataToStorage();
            const companySelect = document.getElementById('adhocCompanySelect');
            if (companySelect) {
                companySelect.innerHTML += `<option value="${trimmed}">${trimmed}</option>`;
                companySelect.value = trimmed;
            }
        } else {
            alert("این شرکت از قبل وجود دارد.");
        }
    }
}

function addNewPaymentType() {
    const newType = prompt("لطفا نوع پرداخت جدید را وارد کنید:");
    if (newType && newType.trim()) {
        const trimmed = newType.trim();
        if (!paymentTypes.includes(trimmed)) {
            paymentTypes.push(trimmed);
            paymentTypes.sort(); // مرتب‌سازی الفبایی
            saveDataToStorage();
            
            // به‌روزرسانی لیست در مدال
            const typeSelect = document.getElementById('adhocTypeSelect');
            if (typeSelect) {
                // حفظ گزینه انتخابی فعلی
                const currentValue = typeSelect.value;
                typeSelect.innerHTML = '<option value="">انتخاب کنید...</option>';
                paymentTypes.forEach(type => {
                    typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
                });
                typeSelect.value = trimmed; // انتخاب نوع جدید
            }
            
            // به‌روزرسانی فیلتر
            populateAdHocFilters(globalAdHocData);
            
            alert(`نوع پرداخت "${trimmed}" با موفقیت اضافه شد.`);
        } else {
            alert("این نوع پرداخت از قبل وجود دارد.");
        }
    }
}

// ========== ADD: مدیریت ویرایش/حذف انواع پرداخت ==========

/**
 * نمایش لیست انواع پرداخت برای مدیریت
 */
function managePaymentTypes() {
    if (paymentTypes.length === 0) {
        alert("هیچ نوع پرداختی تعریف نشده است.");
        return;
    }
    
    let message = "انواع پرداخت موجود:\n\n";
    paymentTypes.forEach((type, index) => {
        message += `${index + 1}. ${type}\n`;
    });
    message += "\nبرای حذف یک نوع، شماره آن را وارد کنید (یا Cancel برای انصراف):";
    
    const answer = prompt(message);
    if (answer && !isNaN(answer)) {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < paymentTypes.length) {
            const removed = paymentTypes[index];
            
            // بررسی استفاده در داده‌ها
            const inUse = globalAdHocData.some(p => p.payment_type === removed);
            if (inUse) {
                const confirm = window.confirm(
                    `نوع پرداخت "${removed}" در ${globalAdHocData.filter(p => p.payment_type === removed).length} رکورد استفاده شده است.\n\nآیا از حذف آن مطمئن هستید؟`
                );
                if (!confirm) return;
            }
            
            paymentTypes.splice(index, 1);
            saveDataToStorage();
            alert(`نوع پرداخت "${removed}" حذف شد.`);
            
            // به‌روزرسانی UI
            populateAdHocFilters(globalAdHocData);
        } else {
            alert("شماره نامعتبر است.");
        }
    }
}

// ========== SECTION 8: NOTE MODAL ==========
function openNoteModal(noteKey) {
    currentNoteKey = noteKey;
    const noteTextarea = document.getElementById('noteTextarea');
    const noteModal = document.getElementById('noteModal');
    if (noteTextarea) noteTextarea.value = localStorage.getItem(noteKey) || '';
    if (noteModal) {
        noteModal.style.display = 'block';
        noteTextarea?.focus();
    }
}

function saveNote() {
    const noteTextarea = document.getElementById('noteTextarea');
    if (currentNoteKey && noteTextarea) {
        const noteValue = noteTextarea.value.trim();
        if (noteValue) {
            localStorage.setItem(currentNoteKey, noteValue);
        } else {
            localStorage.removeItem(currentNoteKey);
        }
    }
    closeNoteModal();
    
    // Refresh current view
    if (document.getElementById('tab-salary').style.display === 'block') {
        applySalaryFilters();
    }
    if (document.getElementById('tab-adhoc').style.display === 'block') {
        applyAdHocFilters();
    }
    if (document.getElementById('employeeDossierModal').style.display === "block") {
        // Re-open dossier to refresh
        const empKeyMatch = currentNoteKey.match(/note_(salary|adhoc)_(.+)_\d+_\d+/);
        if (empKeyMatch) {
            const empKey = empKeyMatch[2];
            closeEmployeeDossier();
            setTimeout(() => openEmployeeDossier(empKey), 100);
        }
    }
}

function closeNoteModal() {
    const noteModal = document.getElementById('noteModal');
    if (noteModal) noteModal.style.display = 'none';
    currentNoteKey = null;
}

// ========== SECTION 9: DATA IMPORT/EXPORT ==========
function handleJsonFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    showLoading('در حال وارد کردن داده...');
    const reader = new FileReader();
    reader.onload = (ev) => {
        setTimeout(() => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (imported.payrollData && imported.payrollLimits && imported.companyList) {
                    globalMonthlyData = imported.payrollData;
                    globalAdHocData = imported.adHocData || [];
                    limitsByLevel = imported.payrollLimits;
                    companyList = imported.companyList;
                    paymentTypes = imported.paymentTypes || [];
                    mappingProfiles = imported.mappingProfiles || {};
                    saveDataToStorage();
                    alert("داده‌ها با موفقیت وارد شد.");
                    initializeApp(true);
                } else {
                    throw new Error("ساختار فایل .json معتبر نیست.");
                }
            } catch (error) {
                console.error("Error importing JSON:", error);
                alert("خطا در ورود داده: " + error.message);
            } finally {
                hideLoading();
                e.target.value = '';
            }
        }, 50);
    };
    reader.readAsText(file);
}

function exportData() {
    if (globalMonthlyData.length === 0 && globalAdHocData.length === 0) {
        alert("هیچ داده‌ای برای خروجی گرفتن وجود ندارد.");
        return;
    }
    showLoading('در حال آماده‌سازی خروجی...');
    setTimeout(() => {
        const dataToExport = {
            payrollData: globalMonthlyData,
            adHocData: globalAdHocData,
            payrollLimits: limitsByLevel,
            companyList: companyList,
            paymentTypes: paymentTypes,
            mappingProfiles: mappingProfiles
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payroll_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        hideLoading();
        alert("خروجی داده با موفقیت انجام شد.");
    }, 50);
}

function handleLimitsFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    showLoading('در حال پردازش فایل سقف‌ها...');
    const reader = new FileReader();
    reader.onload = (ev) => {
        setTimeout(() => {
            try {
                const workbook = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                if (!workbook.Sheets.limits) {
                    throw new Error("فایل اکسل باید شامل یک شیت با نام 'limits' باشد.");
                }
                const limitsDataRaw = XLSX.utils.sheet_to_json(workbook.Sheets["limits"]);
                if (limitsDataRaw.length === 0) {
                    throw new Error("شیت 'limits' هیچ داده‌ای ندارد.");
                }
                const newLimitsByLevel = {};
                const tempLimitsData = limitsDataRaw.map(r => normalizeKeys(r, limitsHeaderMap));
                for (const l of tempLimitsData) {
                    if (l.level) {
                        newLimitsByLevel[l.level.toString().trim()] = l;
                    }
                }
                limitsByLevel = newLimitsByLevel;
                saveDataToStorage();
                alert(`سقف‌ها با موفقیت به‌روزرسانی شد. (${Object.keys(limitsByLevel).length} سطح تعریف شد)`);
                if (globalMonthlyData.length > 0) {
                    applySalaryFilters();
                    buildCharts(globalMonthlyData);
                    updateKpiCards(globalMonthlyData);
                }
            } catch (error) {
                console.error("خطا در پردازش فایل سقف‌ها:", error);
                alert("خطا در پردازش فایل سقف‌ها: " + error.message);
            } finally {
                hideLoading();
                e.target.value = '';
            }
        }, 50);
    };
    reader.readAsArrayBuffer(file);
}

// ========== SECTION 10: EMPLOYEE PROFILES & DOSSIER ==========
/**
 * ساخت پروفایل یکپارچه برای هر کارمند (ترکیب حقوق و پرداخت‌های موردی)
 */
function buildEmployeeProfiles(salaryData, adhocData) {
    const profiles = {};

    // پردازش داده‌های حقوق و مزایا
    const sortedSalary = [...salaryData].sort((a, b) => 
        (a.year - b.year) || (monthsMap[a.month] - monthsMap[b.month])
    );
    
    for (const record of sortedSalary) {
        if (record.key) {
            if (!profiles[record.key]) {
                profiles[record.key] = {
                    key: record.key,
                    name: `${record.fname} ${record.lname}`,
                    fname: record.fname,
                    lname: record.lname,
                    salaryHistory: [],
                    adhocHistory: [],
                    lastMonthIdentifier: null,
                    isActive: false,
                    lastActivity: null
                };
            }
            profiles[record.key].salaryHistory.push(record);
        }
    }

    // پردازش داده‌های پرداخت‌های موردی
    const sortedAdhoc = [...adhocData].sort((a, b) => 
        (a.year - b.year) || (monthsMap[a.month] - monthsMap[b.month])
    );
    
    for (const record of sortedAdhoc) {
        if (record.key) {
            if (!profiles[record.key]) {
                profiles[record.key] = {
                    key: record.key,
                    name: `${record.fname} ${record.lname}`,
                    fname: record.fname,
                    lname: record.lname,
                    salaryHistory: [],
                    adhocHistory: [],
                    lastMonthIdentifier: null,
                    isActive: false,
                    lastActivity: null
                };
            }
            profiles[record.key].adhocHistory.push(record);
        }
    }

    // تعیین وضعیت فعال/غیرفعال بر اساس آخرین حقوق و مزایا
    if (salaryData.length > 0) {
        const latestRecord = sortedSalary.at(-1);
        const latestOverallMonthIdentifier = `${latestRecord.year}-${monthsMap[latestRecord.month]}`;
        
        for (const key in profiles) {
            const lastSalaryRecord = profiles[key].salaryHistory.at(-1);
            if (lastSalaryRecord) {
                profiles[key].lastMonthIdentifier = `${lastSalaryRecord.year}-${monthsMap[lastSalaryRecord.month]}`;
                profiles[key].isActive = profiles[key].lastMonthIdentifier === latestOverallMonthIdentifier;
                profiles[key].lastActivity = `${lastSalaryRecord.year} - ${lastSalaryRecord.month}`;
            } else {
                // اگر فقط پرداخت موردی دارد
                const lastAdhocRecord = profiles[key].adhocHistory.at(-1);
                if (lastAdhocRecord) {
                    profiles[key].lastActivity = `${lastAdhocRecord.year} - ${lastAdhocRecord.month} (فقط پرداخت موردی)`;
                    profiles[key].isActive = false;
                }
            }
        }
    }

    return profiles;
}

/**
 * باز کردن پروفایل یکپارچه کارمند
 */
function openEmployeeDossier(employeeKey) {
    const profile = employeeProfiles[employeeKey];
    if (!profile) {
        alert("اطلاعات این کارمند یافت نشد.");
        return;
    }

    // اطلاعات هدر
    const lastSalaryRecord = profile.salaryHistory.at(-1);
    const displayName = profile.name;
    const displayPosition = lastSalaryRecord 
        ? `${lastSalaryRecord.semat || 'فاقد سمت'} در ${lastSalaryRecord.company || 'شرکت نامشخص'}` 
        : profile.adhocHistory.length > 0 
            ? `کارمند با ${profile.adhocHistory.length} پرداخت موردی`
            : 'بدون اطلاعات';

    document.getElementById('dossierName').textContent = `پرونده کامل: ${displayName}`;
    document.getElementById('dossierPosition').textContent = displayPosition;

    // وضعیت فعال/غیرفعال
    const statusBadge = document.getElementById('dossierStatus');
    if (profile.isActive) {
        statusBadge.textContent = 'فعال';
        statusBadge.className = 'dossier-status-badge';
    } else {
        statusBadge.textContent = `آخرین فعالیت: ${profile.lastActivity || '-'}`;
        statusBadge.className = 'dossier-status-badge inactive';
    }

    // 🔥 KPI های بهبودیافته (شامل پرداخت‌های موردی)
    const totalNetNoMission = profile.salaryHistory.reduce((sum, rec) => sum + (rec.net_no_mission || 0), 0);
    const totalNetWithMission = profile.salaryHistory.reduce((sum, rec) => sum + (rec.net_with_mission || 0), 0);
    const totalAdhocPayments = profile.adhocHistory.reduce((sum, rec) => sum + (rec.amount || 0), 0);
    const durationInMonths = profile.salaryHistory.length;

    document.getElementById('dossierKpiNetNoMission').textContent = formatPersianNumber(totalNetNoMission);
    document.getElementById('dossierKpiNetWithMission').textContent = formatPersianNumber(totalNetWithMission);
    document.getElementById('dossierKpiAvgNetNoMission').textContent = durationInMonths > 0 
        ? formatPersianNumber(Math.round(totalNetNoMission / durationInMonths)) 
        : '-';
    document.getElementById('dossierKpiAvgNetWithMission').textContent = durationInMonths > 0 
        ? formatPersianNumber(Math.round(totalNetWithMission / durationInMonths)) 
        : '-';

    // 🔥 جدول تاریخچه یکپارچه (ترکیب حقوق و پرداخت‌های موردی)
    renderUnifiedPaymentHistory(profile);

    // رندر چارت (فقط برای حقوق و مزایا)
    if (profile.salaryHistory.length > 0) {
        renderDossierChart(profile);
    } else {
        // اگر فقط پرداخت موردی داشت
        const chartWrapper = document.querySelector('.dossier-chart-wrapper');
        if (chartWrapper) {
            chartWrapper.innerHTML = `
                <div class="no-chart-message">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="48" height="48" style="color: #cbd5e1; margin-bottom: 1rem;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    <p style="color: #64748b; text-align: center;">نمودار تنها برای داده‌های حقوق و مزایا قابل نمایش است</p>
                </div>
            `;
        }
    }

    // نمایش مدال
    document.getElementById('employeeDossierModal').style.display = 'block';
}

/**
 * رندر جدول تاریخچه یکپارچه
 */
function renderUnifiedPaymentHistory(profile) {
    const tableElement = document.getElementById("dossierPaymentTable");
    if (!tableElement) return;

    tableElement.innerHTML = `
        <thead>
            <tr>
                <th>تاریخ</th>
                <th>نوع</th>
                <th>شرکت</th>
                <th>مبلغ/خالص</th>
                <th style="min-width: 200px;">جزئیات/یادداشت</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = tableElement.querySelector('tbody');
    let tableHTML = '';

    // ترکیب و مرتب‌سازی همه پرداخت‌ها
    const allPayments = [
        ...profile.salaryHistory.map(r => ({ 
            ...r, 
            type: 'salary', 
            displayType: 'حقوق و مزایا',
            sortDate: `${r.year}-${String(monthsMap[r.month]).padStart(2, '0')}`
        })),
        ...profile.adhocHistory.map(r => ({ 
            ...r, 
            type: 'adhoc', 
            displayType: r.payment_type,
            sortDate: `${r.year}-${String(monthsMap[r.month]).padStart(2, '0')}`
        }))
    ].sort((a, b) => b.sortDate.localeCompare(a.sortDate)); // جدیدترین اول

    // 🔥 آمار کلی در بالای جدول
    const totalSalaryRecords = profile.salaryHistory.length;
    const totalAdhocRecords = profile.adhocHistory.length;
    const totalAdhocAmount = profile.adhocHistory.reduce((sum, r) => sum + (r.amount || 0), 0);

    tableHTML += `
        <tr style="background: #f8fafc; font-weight: 600; border-top: 2px solid #e2e8f0;">
            <td colspan="5" style="padding: 0.75rem; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; font-size: 0.85rem;">
                    <span style="color: #0369a1;">📊 ${totalSalaryRecords} ماه حقوق و مزایا</span>
                    <span style="color: #92400e;">💵 ${totalAdhocRecords} پرداخت موردی</span>
                    <span style="color: #15803d;">💰 جمع پرداخت‌های موردی: ${formatPersianNumber(totalAdhocAmount)}</span>
                </div>
            </td>
        </tr>
    `;

    if (allPayments.length === 0) {
        tableHTML += `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
                    هیچ پرداختی ثبت نشده است
                </td>
            </tr>
        `;
    } else {
        for (const rec of allPayments) {
            if (rec.type === 'salary') {
                const limit = limitsByLevel[rec.level];
                const baseKey = `note_salary_${rec.key}_${rec.year}_${monthsMap[rec.month]}`;
                
                tableHTML += `
                    <tr style="background: #f0f9ff;">
                        <td style="white-space: nowrap;">${rec.year}-${rec.month}</td>
                        <td>
                            <span class="badge" style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                ${rec.displayType}
                            </span>
                        </td>
                        <td>${rec.company}</td>
                        <td style="direction: ltr; text-align: left;">
                            ${cellWithStatus(rec.net_no_mission, limit?.limit_net_no_mission, `${baseKey}_net_no`)}
                        </td>
                        <td style="font-size: 0.85rem; color: #475569;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <span>${rec.level || '-'}</span>
                                <span style="color: #cbd5e1;">|</span>
                                <span>${rec.semat || '-'}</span>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // پرداخت موردی
                const noteKey = `note_adhoc_${rec.key}_${rec.year}_${monthsMap[rec.month]}`;
                const noteText = localStorage.getItem(noteKey);
                
                tableHTML += `
                    <tr style="background: #fefce8;">
                        <td style="white-space: nowrap;">${rec.year}-${rec.month}</td>
                        <td>
                            <span class="badge" style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                ${rec.displayType}
                            </span>
                        </td>
                        <td>${rec.company}</td>
                        <td class="amount" style="direction: ltr; text-align: left; font-weight: 600; color: #15803d;">
                            ${formatPersianNumber(rec.amount)}
                        </td>
                        <td style="font-size: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="note-icon" onclick="openNoteModal('${noteKey}')" title="${noteText || 'ثبت یادداشت'}">
                                    ${noteText ? iconComment : iconPencil}
                                </span>
                                <span style="color: ${noteText ? '#0369a1' : '#94a3b8'}; font-style: ${noteText ? 'normal' : 'italic'};">
                                    ${noteText || rec.description || 'بدون یادداشت'}
                                </span>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    tbody.innerHTML = tableHTML;
}

/**
 * بستن مدال پروفایل
 */
function closeEmployeeDossier() {
    document.getElementById('employeeDossierModal').style.display = 'none';
    if (dossierChartInstance) {
        dossierChartInstance.destroy();
        dossierChartInstance = null;
    }
}

/**
 * چاپ پروفایل
 */
function printDossier() {
    if (dossierChartInstance) {
        dossierChartInstance.options.plugins.datalabels = dossierChartInstance.options.plugins.datalabels || {};
        dossierChartInstance.options.plugins.datalabels.display = true;
        dossierChartInstance.update('none');
    }
    window.print();
    if (dossierChartInstance) {
        setTimeout(() => {
            dossierChartInstance.options.plugins.datalabels.display = false;
            dossierChartInstance.update('none');
        }, 500);
    }
}

// ========== SECTION 11: DOSSIER CHART ==========
function renderDossierChart(profile) {
    if (dossierChartInstance) {
        dossierChartInstance.destroy();
    }

    const chartWrapper = document.querySelector('.dossier-chart-wrapper');
    chartWrapper.innerHTML = `
        <div class="dossier-chart-container">
            <div class="dossier-chart-header">
                <div class="dossier-chart-title">روند تغییرات حقوق و دستمزد</div>
                <div class="chart-info-badges">
                    <span class="chart-info-badge">📈 ${profile.salaryHistory.length} ماه</span>
                    <span class="chart-info-badge" title="تعداد دفعات تغییر سطح شغلی یا شرکت در سوابق">⚡ ${countChanges(profile.salaryHistory)} تغییر</span>
                </div>
            </div>
            <div class="chart-aspect-ratio-wrapper">
                <canvas id="dossierChart"></canvas>
            </div>
            <div id="dossierChartLegend"></div>
        </div>
    `;

    const ctx = document.getElementById('dossierChart')?.getContext('2d');
    if (!ctx) return;

    const history = profile.salaryHistory;
    const labels = history.map(r => `${r.year}/${monthsMap[r.month]}`);

    const changePoints = history.map((rec, index) => {
        if (index === 0) return { radius: 4, hoverRadius: 8 };
        const prev = history[index - 1];
        const hasLevelChange = rec.level !== prev.level;
        const hasCompanyChange = rec.company !== prev.company;
        const hasMajorSalaryChange = prev.base_pay_30 > 0 && Math.abs((rec.base_pay_30 - prev.base_pay_30) / prev.base_pay_30) > 0.1;
        
        if (hasLevelChange || hasCompanyChange) {
            return { radius: 8, hoverRadius: 12, borderWidth: 3 };
        } else if (hasMajorSalaryChange) {
            return { radius: 6, hoverRadius: 10, borderWidth: 2 };
        }
        return { radius: 3, hoverRadius: 6 };
    });

    const datasetsConfig = [
        { label: 'خالص (با ماموریت)', key: 'net_with_mission', color: '#00D9FF', visible: true, thickness: 4, glow: true, pointRadius: 4 },
        { label: 'خالص (بدون ماموریت)', key: 'net_no_mission', color: '#667EEA', visible: true, thickness: 4, glow: true, pointRadius: 4 },
        { label: 'سقف خالص (با ماموریت)', key: 'limit_net_with_mission', color: '#00D9FF', visible: true, dashed: true, opacity: 0.5 },
        { label: 'سقف خالص (بدون ماموریت)', key: 'limit_net_no_mission', color: '#667EEA', visible: true, dashed: true, opacity: 0.5 },
        { label: 'حقوق پایه', key: 'base_pay_30', color: '#F5A623', visible: true, thickness: 3, pointRadius: 3 },
        { label: 'کارانه', key: 'bonus', color: '#BD10E0', visible: false, thickness: 3, pointRadius: 3 },
        { label: 'اضافه‌کار', key: 'overtime_amount', color: '#FF6B6B', visible: false, thickness: 3, pointRadius: 3 }
    ];

    const datasets = datasetsConfig.map((config) => {
        const data = history.map(r => {
            if (config.key.startsWith('limit_')) {
                return limitsByLevel[r.level]?.[config.key] || null;
            }
            return r[config.key] || null;
        });
        
        const dataset = {
            label: config.label,
            data: data,
            borderColor: config.color,
            backgroundColor: config.glow ? `${config.color}15` : 'transparent',
            borderWidth: config.thickness || 2,
            tension: 0.3,
            borderDash: config.dashed ? [10, 5] : [],
            hidden: !config.visible,
            fill: config.glow ? 'start' : false,
            pointRadius: config.dashed ? 0 : (config.pointRadius || changePoints.map(p => p.radius)),
            pointHoverRadius: config.dashed ? 0 : (config.pointRadius ? config.pointRadius + 2 : changePoints.map(p => p.hoverRadius)),
            pointBackgroundColor: config.color,
            pointBorderColor: '#fff',
            pointBorderWidth: config.dashed ? 0 : changePoints.map(p => p.borderWidth || 2),
            pointHoverBackgroundColor: config.color,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            pointStyle: config.dashed ? 'line' : 'circle',
        };
        
        if (config.opacity) {
            dataset.borderColor = hexToRgba(config.color, config.opacity);
        }
        return dataset;
    });

    dossierChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: { borderCapStyle: 'round', borderJoinStyle: 'round' },
                point: { hitRadius: 10 }
            },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(44, 62, 80, 0.95)',
                    titleFont: { family: 'Vazirmatn', size: 14, weight: 'bold' },
                    bodyFont: { family: 'Vazirmatn', size: 13 },
                    padding: 15,
                    cornerRadius: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        title: (tooltipItems) => {
                            const record = history[tooltipItems[0].dataIndex];
                            return `${record.month} ${record.year}`;
                        },
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatPersianNumber(ctx.parsed.y)}`,
                        afterBody: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            if (index > 0) {
                                const current = history[index];
                                const prev = history[index - 1];
                                const changes = [];
                                
                                if (current.level !== prev.level) {
                                    changes.push(`✨ تغییر سطح: ${prev.level} ← ${current.level}`);
                                }
                                if (current.company !== prev.company) {
                                    changes.push(`🏢 تغییر شرکت: ${prev.company} ← ${current.company}`);
                                }
                                if (prev.base_pay_30 > 0) {
                                    const salaryChange = ((current.base_pay_30 - prev.base_pay_30) / prev.base_pay_30 * 100).toFixed(1);
                                    if (Math.abs(salaryChange) > 5) {
                                        changes.push(`${salaryChange > 0 ? '📈' : '📉'} تغییر حقوق: ${salaryChange}%`);
                                    }
                                }
                                return changes.length > 0 ? ['', ...changes] : [];
                            }
                            return [];
                        }
                    }
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#6c757d',
                        font: { family: 'Vazirmatn', size: 11 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false, borderColor: 'rgba(229, 236, 239, 0.5)' }
                },
                y: {
                    position: 'left',
                    ticks: {
                        color: '#6c757d',
                        font: { family: 'Vazirmatn', size: 11 },
                        callback: (value) => {
                            if (value >= 1e9) return (value / 1e9).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' B';
                            if (value >= 1e6) return (value / 1e6).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' M';
                            if (value >= 1e3) return (value / 1e3).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) + ' K';
                            return value.toLocaleString('fa-IR');
                        }
                    },
                    grid: { color: 'rgba(229, 236, 239, 0.2)', borderDash: [3, 3] }
                }
            },
            animation: { duration: 1500, easing: 'easeInOutQuart' }
        }
    });
    
    createCustomDossierLegend(datasetsConfig);
}

function createCustomDossierLegend(datasetsConfig) {
    const legendContainer = document.getElementById('dossierChartLegend');
    if (!legendContainer) return;
    
    let legendHTML = '';
    datasetsConfig.forEach((ds, index) => {
        legendHTML += `<div class="legend-item ${!ds.visible ? 'legend-disabled' : ''}" style="--legend-color: ${ds.color};" onclick="toggleDossierLegendItem(${index})"><span class="legend-label">${ds.label}</span></div>`;
    });
    legendContainer.innerHTML = legendHTML;
}

function toggleDossierLegendItem(index) {
    if (!dossierChartInstance) return;
    const isVisible = dossierChartInstance.isDatasetVisible(index);
    dossierChartInstance.setDatasetVisibility(index, !isVisible);
    dossierChartInstance.update();
    const legendItem = document.querySelectorAll('.legend-item')[index];
    if (legendItem) {
        legendItem.classList.toggle('legend-disabled', isVisible);
    }
}

function countChanges(history) {
    let changes = 0;
    for (let i = 1; i < history.length; i++) {
        const current = history[i];
        const prev = history[i - 1];
        const structuralChange = current.level !== prev.level || current.company !== prev.company || current.semat !== prev.semat;
        let significantPayChange = false;
        if (prev.base_pay_30 && current.base_pay_30 && prev.base_pay_30 > 0) {
            if (Math.abs((current.base_pay_30 - prev.base_pay_30) / prev.base_pay_30) > 0.10) {
                significantPayChange = true;
            }
        }
        if (structuralChange || significantPayChange) changes++;
    }
    return changes;
}

function hexToRgba(hex, opacity) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` : hex;
}

// ========== SECTION 12: CHARTS & KPI ==========
function buildCharts(monthlyData) {
    if (!monthlyData || monthlyData.length === 0) return;
    
    const violationTypes = ['base_pay', 'allowance', 'bonus', 'overtime', 'net_no_mission', 'net_with_mission'];
    const dataByMonth = {};
    
    monthlyData.forEach(emp => {
        const monthKey = `${emp.year}-${String(monthsMap[emp.month]).padStart(2, '0')}`;
        if (!dataByMonth[monthKey]) {
            dataByMonth[monthKey] = {
                base_pay: 0, allowance: 0, bonus: 0,
                overtime: 0, net_no_mission: 0, net_with_mission: 0
            };
        }
        violationTypes.forEach(type => {
            if (isNonCompliant(emp, type)) {
                dataByMonth[monthKey][type]++;
            }
        });
    });
    
    const sortedMonths = Object.keys(dataByMonth).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        const monthName = Object.keys(monthsMap).find(key => monthsMap[key] == parseInt(month));
        return `${monthName} ${year.slice(2)}`;
    });
    
    const createChart = (canvasId, type, label) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (charts[canvasId]) charts[canvasId].destroy();
        
        const data = sortedMonths.map(month => dataByMonth[month][type]);
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: '#6a7de4',
                    backgroundColor: 'rgba(106, 125, 228, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    };
    
    createChart('chartBasePay', 'base_pay', 'تخطی حقوق پایه');
    createChart('chartOvertime', 'overtime', 'تخطی اضافه‌کار');
    createChart('chartAllowance', 'allowance', 'تخطی مزایا');
    createChart('chartBonus', 'bonus', 'تخطی کارانه');
    createChart('chartNetNoMission', 'net_no_mission', 'تخطی خالص (بدون ماموریت)');
    createChart('chartNetWithMission', 'net_with_mission', 'تخطی خالص (با ماموریت)');
}

function updateKpiCards(monthlyData) {
    if (!monthlyData || monthlyData.length === 0) return;
    
    const lastMonthRecord = [...monthlyData].sort((a, b) => (b.year - a.year) || (monthsMap[b.month] - monthsMap[a.month]))[0];
    const lastMonthData = monthlyData.filter(d => d.year === lastMonthRecord.year && d.month === lastMonthRecord.month);
    
    let totalViolations = 0;
    const violationCounts = {
        base_pay: 0, allowance: 0, bonus: 0,
        overtime: 0, net_no_mission: 0, net_with_mission: 0
    };
    const companyViolations = {};
    const violationTypeMap = {
        base_pay: 'حقوق پایه',
        allowance: 'مزایا',
        bonus: 'کارانه',
        overtime: 'اضافه‌کار',
        net_no_mission: 'خالص',
        net_with_mission: 'خالص با ماموریت'
    };
    
    lastMonthData.forEach(emp => {
        let hasViolation = false;
        for (const type in violationCounts) {
            if (isNonCompliant(emp, type)) {
                hasViolation = true;
                violationCounts[type]++;
                companyViolations[emp.company] = (companyViolations[emp.company] || 0) + 1;
            }
        }
        if (hasViolation) totalViolations++;
    });
    
    const kpiTotal = document.getElementById('kpiTotalViolations');
    const kpiTopType = document.getElementById('kpiTopViolationType');
    const kpiTopCompany = document.getElementById('kpiTopCompany');
    
    if (kpiTotal) kpiTotal.textContent = formatPersianNumber(totalViolations);
    
    const topViolationType = Object.entries(violationCounts).sort(([, a], [, b]) => b - a)[0];
    if (kpiTopType) {
        kpiTopType.textContent = topViolationType && topViolationType[1] > 0 ? violationTypeMap[topViolationType[0]] : '-';
    }
    
    const topCompany = Object.entries(companyViolations).sort(([, a], [, b]) => b - a)[0];
    if (kpiTopCompany) {
        kpiTopCompany.textContent = topCompany && topCompany[1] > 0 ? topCompany[0] : '-';
    }
}

// ========== SECTION 13: HELPER FUNCTIONS ==========
function isNonCompliant(emp, type) {
    const limit = limitsByLevel[emp.level];
    if (!limit) return false;
    
    const checkOvertime = () => {
        const overtimeLimit = emp.level?.includes("مدیرعامل") ? 125 : 105;
        return emp.overtime_hours > overtimeLimit;
    };
    
    const checks = {
        base_pay: () => getNumber(emp.base_pay_30) > getNumber(limit.limit_base_30),
        allowance: () => getNumber(emp.allowance_30) > getNumber(limit.limit_allowance),
        bonus: () => getNumber(emp.bonus) > getNumber(limit.limit_bonus),
        overtime: checkOvertime,
        net_no_mission: () => getNumber(emp.net_no_mission) > getNumber(limit.limit_net_no_mission),
        net_with_mission: () => getNumber(emp.net_with_mission) > getNumber(limit.limit_net_with_mission),
    };
    
    return !!checks[type] && checks[type]();
}

function cellWithStatus(value, limit, noteKey) {
    if (value == null || isNaN(parseFloat(value))) {
        return `<span>${formatPersianNumber(value)}</span>`;
    }
    
    const rounded = Math.round(value);
    const isViolation = limit !== null && limit !== undefined && rounded > limit;
    
    if (!isViolation) {
        return `<span class='ok'>${formatPersianNumber(rounded)}</span>`;
    }
    
    const diff = Math.round(rounded - limit);
    const hasNote = noteKey && localStorage.getItem(noteKey);
    const noteHtml = `<span class="note-icon" onclick="openNoteModal('${noteKey}')" title="${hasNote ? localStorage.getItem(noteKey) : 'ثبت یادداشت'}">${hasNote ? iconComment : iconPencil}</span>`;
    
    return `<div style="display:flex; justify-content:center; align-items:center; gap: 4px;">${noteHtml}<span class='nok'>${formatPersianNumber(rounded)}<span class='diff'>+${formatPersianNumber(diff)}</span></span></div>`;
}

function renderOvertimeHours(emp, includeNote = true) {
    const hours = emp.overtime_hours;
    if (hours === null || hours === undefined) return "-";
    
    const limit = (emp.level?.includes("مدیرعامل")) ? 125 : 105;
    const isViolation = hours > limit;
    
    if (!isViolation) {
        return `<span class="ok">${formatPersianNumber(hours)}</span>`;
    }
    
    const diff = hours - limit;
    const noteKey = `note_salary_${emp.key}_${emp.year}_${monthsMap[emp.month]}_overtime`;
    const noteText = localStorage.getItem(noteKey);
    const noteHtml = includeNote ? `<span class="note-icon" onclick="openNoteModal('${noteKey}')" title="${noteText || 'ثبت یادداشت'}">${noteText ? iconComment : iconPencil}</span>` : '';
    
    return `<div style="display:flex; justify-content:center; align-items:center; gap: 4px;">${noteHtml}<span class="nok">${formatPersianNumber(hours)}<span class="diff">+${formatPersianNumber(diff)}</span></span></div>`;
}

function calcSalaryChange(emp) {
    const profile = employeeProfiles[emp.key];
    if (!profile) return "-";
    
    const currentIndex = profile.salaryHistory.findIndex(h => h.year === emp.year && h.month === emp.month);
    
    if (currentIndex === 0) return "استخدام جدید";
    if (currentIndex > 0) {
        const prev = profile.salaryHistory[currentIndex - 1];
        if (!prev || prev.base_pay_30 === undefined || emp.base_pay_30 === undefined) return "-";
        
        const diff = Math.round(emp.base_pay_30 - prev.base_pay_30);
        if (diff === 0) return "بدون تغییر";
        if (diff > 0) return `<span class='ok'>+${formatPersianNumber(diff)}</span>`;
        return `<span class='nok'>${formatPersianNumber(diff)}</span>`;
    }
    return "اولین رکورد";
}

// ========== COMPLETE SECTION 14: MAPPING MODAL ==========

/**
 * باز کردن مدال نگاشت برای فایل اکسل
 */
function openMappingModal(event) {
    currentFile = event.target.files[0];
    if (!currentFile) return;
    
    showLoading('در حال خواندن فایل اکسل...');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array', sheetRows: 1 });
            const firstSheetName = workbook.SheetNames[0];
            const headers = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 })[0] || [];
            currentFileHeaders = headers.filter(h => h && h.toString().trim() !== '');
            
            if (currentFileHeaders.length === 0) {
                throw new Error("فایل اکسل خالی است یا هدر معتبری یافت نشد.");
            }
            
            buildMappingUI();
            
            const modal = document.getElementById('mappingModal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            alert(`خطا در خواندن فایل اکسل: ${error.message}`);
            console.error(error);
        } finally {
            hideLoading();
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(currentFile);
}

/**
 * بستن مدال نگاشت
 */
function closeMappingModal() {
    const modal = document.getElementById('mappingModal');
    if (modal) modal.style.display = 'none';
    currentFile = null;
    currentFileHeaders = [];
}

/**
 * ساخت رابط کاربری نگاشت
 */
function buildMappingUI() {
    // پر کردن لیست شرکت‌ها
    const companySelect = document.getElementById('companySelect');
    if (companySelect) {
        companySelect.innerHTML = '<option value="" disabled selected>یک شرکت را انتخاب کنید...</option>';
        companyList.forEach(c => {
            companySelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
    
    // تنظیم سال شمسی جاری
    const currentShamsiYear = getCurrentShamsiYear();
    const yearInput = document.getElementById('yearSelect');
    if (yearInput) yearInput.value = currentShamsiYear;
    
    // پر کردن لیست ماه‌ها
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
        monthSelect.innerHTML = Object.keys(monthsMap).map(m => `<option value="${m}">${m}</option>`).join('');
    }
    
    // پر کردن استخر هدرهای اکسل
    const excelPool = document.getElementById('excelHeadersPool');
    const systemFieldsContainer = document.getElementById('systemFieldsContainer');
    
    if (excelPool) excelPool.innerHTML = '';
    if (systemFieldsContainer) systemFieldsContainer.innerHTML = '';
    
    currentFileHeaders.forEach(header => {
        if (excelPool) {
            const headerItem = document.createElement('div');
            headerItem.className = 'dnd-header-item';
            headerItem.dataset.header = header;
            headerItem.textContent = header;
            excelPool.appendChild(headerItem);
        }
    });
    
    // ساخت فیلدهای سیستم گروه‌بندی شده
    const groupedFields = Object.entries(SYSTEM_FIELDS).reduce((acc, [key, val]) => {
        (acc[val.group] = acc[val.group] || []).push({ key, ...val });
        return acc;
    }, {});
    
    if (systemFieldsContainer) {
        for (const groupName in groupedFields) {
            const groupTitle = document.createElement('h4');
            groupTitle.className = 'dnd-group-title';
            groupTitle.textContent = groupName;
            systemFieldsContainer.appendChild(groupTitle);
            
            const groupContainer = document.createElement('div');
            groupContainer.className = 'dnd-system-field-group';
            
            groupedFields[groupName].forEach(({ key, label, required, multiple }) => {
                const fieldEl = document.createElement('div');
                fieldEl.className = 'dnd-system-field';
                fieldEl.innerHTML = `
                    <div class="dnd-system-field-header ${required ? 'required' : ''}">${label}</div>
                    <div class="dnd-dropzone" id="dropzone-${key}" data-system-field="${key}" data-multiple="${multiple}"></div>
                `;
                groupContainer.appendChild(fieldEl);
            });
            
            systemFieldsContainer.appendChild(groupContainer);
        }
    }
    
    // راه‌اندازی Sortable.js برای همه لیست‌ها
    initializeSortable();
    
    // اتصال رویداد به select ماه برای به‌روزرسانی چک‌باکس ۳۱ روزه
    const monthSel = document.getElementById('monthSelect');
    if (monthSel && !monthSel.dataset._boundFor31) {
        monthSel.addEventListener('change', updateBasePayCheckboxes);
        monthSel.dataset._boundFor31 = '1';
    }
    
    ensureBasePayOptions();
    updateDropzoneVisuals();
    validateMappings();
}

/**
 * راه‌اندازی Sortable برای Drag & Drop
 */
function initializeSortable() {
    const excelPool = document.getElementById('excelHeadersPool');
    const allLists = [excelPool, ...document.querySelectorAll('.dnd-dropzone')];
    
    allLists.forEach(list => {
        if (!list) return;
        
        new Sortable(list, {
            group: 'shared',
            animation: 150,
            onAdd: function (evt) {
                const item = evt.item;
                const toList = evt.to;
                
                item.classList.add('dropped');
                
                // اگر فیلد تک‌مقداری است و بیش از یک آیتم دارد
                if (toList.dataset.multiple === 'false' && toList.children.length > 1) {
                    const firstItem = toList.children[0] === item ? toList.children[1] : toList.children[0];
                    if (excelPool) {
                        excelPool.appendChild(firstItem);
                        firstItem.classList.remove('dropped');
                    }
                }
                
                // اگر به dropzone حقوق پایه اضافه شد، چک‌باکس ۳۱ روزه بساز
                if (toList.dataset.systemField === 'base_pay') {
                    addBasePayOption(item);
                    updateBasePayCheckboxes();
                }
                
                updateDropzoneVisuals();
                validateMappings();
            },
            onRemove: function (evt) {
                const item = evt.item;
                const fromList = evt.from;
                
                item.classList.remove('dropped');
                
                // اگر از dropzone حقوق پایه خارج شد، چک‌باکس را حذف کن
                if (fromList.dataset.systemField === 'base_pay') {
                    const opt = item.querySelector('.base-pay-31-option');
                    if (opt) opt.remove();
                }
                
                updateDropzoneVisuals();
                validateMappings();
            },
        });
    });
}

/**
 * افزودن گزینه ۳۱ روزه به آیتم حقوق پایه
 */
function addBasePayOption(itemEl) {
    if (!itemEl.querySelector('.base-pay-31-option')) {
        itemEl.insertAdjacentHTML(
            'beforeend',
            `<label class="base-pay-31-option" title="">
               <input type="checkbox" class="base-pay-31-day-cb">
               <span>مبنای ۳۱ روزه</span>
             </label>`
        );
    }
}

/**
 * به‌روزرسانی وضعیت چک‌باکس‌های ۳۱ روزه بر اساس ماه
 */
function updateBasePayCheckboxes() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;
    
    const month = monthSelect.value;
    const isFirstHalf = (monthsMap[month] || 0) <= 6;
    
    const basePayDropzone = document.getElementById('dropzone-base_pay');
    if (!basePayDropzone) return;
    
    basePayDropzone.querySelectorAll('.dnd-header-item').forEach(item => {
        const option = item.querySelector('.base-pay-31-option');
        if (!option) return;
        
        const cb = option.querySelector('input.base-pay-31-day-cb');
        if (!cb) return;
        
        if (isFirstHalf) {
            cb.disabled = false;
            option.title = '';
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
        } else {
            cb.checked = false;
            cb.disabled = true;
            option.title = 'این گزینه فقط برای ۶ ماه اول سال کاربرد دارد.';
            option.style.opacity = '0.6';
            option.style.cursor = 'not-allowed';
        }
    });
}

/**
 * اطمینان از وجود گزینه ۳۱ روزه برای تمام آیتم‌های حقوق پایه
 */
function ensureBasePayOptions() {
    const basePayDropzone = document.getElementById('dropzone-base_pay');
    if (!basePayDropzone) return;
    
    basePayDropzone.querySelectorAll('.dnd-header-item').forEach(item => {
        addBasePayOption(item);
    });
    updateBasePayCheckboxes();
}

/**
 * به‌روزرسانی ظاهر dropzone ها (خالی/پر)
 */
function updateDropzoneVisuals() {
    document.querySelectorAll('.dnd-dropzone').forEach(dz => {
        dz.classList.toggle('empty-dropzone', dz.children.length === 0);
    });
}

/**
 * اعتبارسنجی نگاشت‌ها (فیلدهای الزامی)
 */
function validateMappings() {
    let allRequiredMet = true;
    
    for (const key in SYSTEM_FIELDS) {
        if (SYSTEM_FIELDS[key].required) {
            const dropzone = document.getElementById(`dropzone-${key}`);
            if (!dropzone || dropzone.children.length === 0) {
                allRequiredMet = false;
                break;
            }
        }
    }
    
    const btn = document.getElementById('processMappingBtn');
    if (btn) btn.disabled = !allRequiredMet;
}

/**
 * افزودن شرکت جدید
 */
function addNewCompany() {
    const newName = prompt("لطفا نام شرکت جدید را وارد کنید:");
    if (newName && newName.trim()) {
        const trimmed = newName.trim();
        if (!companyList.includes(trimmed)) {
            companyList.push(trimmed);
            companyList.sort();
            saveDataToStorage();
            
            const companySelect = document.getElementById('companySelect');
            if (companySelect) {
                const option = document.createElement('option');
                option.value = trimmed;
                option.textContent = trimmed;
                companySelect.appendChild(option);
                companySelect.value = trimmed;
            }
        } else {
            alert("این شرکت از قبل وجود دارد.");
        }
    }
}

/**
 * بارگذاری پروفایل نگاشت ذخیره‌شده برای شرکت
 */
function loadMappingProfileForCompany() {
    const companyName = document.getElementById('companySelect')?.value;
    if (!companyName) return;
    
    const profile = mappingProfiles[companyName];
    if (!profile) return;
    
    showLoading('در حال بارگذاری پروفایل نگاشت...');
    
    setTimeout(() => {
        const excelPool = document.getElementById('excelHeadersPool');
        
        // برگرداندن همه آیتم‌ها به استخر
        document.querySelectorAll('.dnd-dropzone .dnd-header-item').forEach(item => {
            if (excelPool) {
                excelPool.appendChild(item);
                item.classList.remove('dropped');
                // حذف گزینه ۳۱ روزه
                const opt = item.querySelector('.base-pay-31-option');
                if (opt) opt.remove();
            }
        });
        
        // اعمال نگاشت ذخیره‌شده
        for (const header in profile) {
            const item = excelPool?.querySelector(`[data-header="${header}"]`);
            const mapping = profile[header];
            const dropzone = document.getElementById(`dropzone-${mapping.value}`);
            
            if (item && dropzone) {
                dropzone.appendChild(item);
                item.classList.add('dropped');
                
                if (dropzone.dataset.systemField === 'base_pay') {
                    addBasePayOption(item);
                    if (mapping.is31Day) {
                        const checkbox = item.querySelector('.base-pay-31-day-cb');
                        if (checkbox) checkbox.checked = true;
                    }
                }
            }
        }
        
        ensureBasePayOptions();
        updateDropzoneVisuals();
        validateMappings();
        hideLoading();
    }, 200);
}
// ========== COMPLETE SECTION 15: PROCESSING & IMPORT ==========

/**
 * پردازش و وارد کردن داده‌ها
 */
async function processAndImportData() {
    const context = {
        company: document.getElementById('companySelect')?.value,
        year: document.getElementById('yearSelect')?.value,
        month: document.getElementById('monthSelect')?.value,
    };
    
    if (!context.company || !context.year || !context.month) {
        return alert("لطفا شرکت، سال و ماه را مشخص کنید.");
    }
    
    // جمع‌آوری نگاشت کاربر
    const userMap = {};
    document.querySelectorAll('.dnd-dropzone .dnd-header-item').forEach(item => {
        const excelHeader = item.dataset.header;
        const systemField = item.closest('.dnd-dropzone').dataset.systemField;
        const is31Day = item.querySelector('.base-pay-31-day-cb')?.checked || false;
        userMap[excelHeader] = { value: systemField, is31Day };
    });
    
    showLoading('در حال پردازش و شناسایی تداخل‌ها...');
    
    try {
        // خواندن داده‌های اکسل
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(currentFile);
        });
        
        // پردازش و محاسبه
        const processedData = applyMappingAndCalculate(data, userMap, context);
        
        // تشخیص تداخل‌ها
        const targetData = currentFileType === 'salary' ? globalMonthlyData : globalAdHocData;
        const existingRecordMap = new Map(targetData.map(r => [r.uniqueRecordId, r]));
        let newRecords = [];
        conflictList = [];
        
        for (const newRecord of processedData) {
            if (existingRecordMap.has(newRecord.uniqueRecordId)) {
                const oldRecord = existingRecordMap.get(newRecord.uniqueRecordId);
                conflictList.push({ old: oldRecord, new: newRecord, resolution: null });
            } else {
                newRecords.push(newRecord);
            }
        }
        
        // ذخیره پروفایل نگاشت
        const saveProfileCheckbox = document.getElementById('saveMappingProfile');
        if (saveProfileCheckbox && saveProfileCheckbox.checked) {
            const profile = {};
            document.querySelectorAll('.dnd-dropzone .dnd-header-item').forEach(item => {
                const header = item.dataset.header;
                const systemField = item.closest('.dnd-dropzone').dataset.systemField;
                const is31Day = item.querySelector('.base-pay-31-day-cb')?.checked || false;
                profile[header] = { value: systemField, is31Day };
            });
            mappingProfiles[context.company] = profile;
            localStorage.setItem('mappingProfiles_v4', JSON.stringify(mappingProfiles));
        }
        
        // بستن مدال نگاشت
        closeMappingModal();
        
        // مدیریت تداخل‌ها یا افزودن مستقیم
        if (conflictList.length > 0) {
            openConflictModal(newRecords);
            hideLoading();
        } else {
            // افزودن رکوردهای جدید
            if (currentFileType === 'salary') {
                globalMonthlyData.push(...newRecords);
            } else {
                globalAdHocData.push(...newRecords);
            }
            
            saveDataToStorage();
            
            // به‌روزرسانی پروفایل‌ها
            employeeProfiles = buildEmployeeProfiles(globalMonthlyData, globalAdHocData);
            
            hideLoading();
            alert(`پردازش با موفقیت انجام شد.\n- ${newRecords.length} رکورد جدید اضافه شد.\n- 0 رکورد تکراری یافت شد.`);
            
            initializeApp(true);
        }
        
    } catch (error) {
        alert("خطا در پردازش فایل: " + error.message);
        console.error(error);
        hideLoading();
    }
}

/**
 * اعمال نگاشت و محاسبه مقادیر
 */
function applyMappingAndCalculate(rows, map, context) {
    const isFirstHalf = monthsMap[context.month] <= 6;
    
    return rows.map(row => {
        const record = { ...context, raw_inputs: {}, calculated_values: {} };
        
        // مقداردهی اولیه
        Object.keys(SYSTEM_FIELDS).forEach(key => record.raw_inputs[key] = 0);
        
        let fname = '', lname = '', semat = '', level = '';
        
        // اعمال نگاشت
        for (const excelHeader in map) {
            const mapping = map[excelHeader];
            const sysKey = mapping.value;
            const rawValue = row[excelHeader];
            
            // فیلدهای متنی
            if (sysKey === 'fname') { fname = rawValue; continue; }
            if (sysKey === 'lname') { lname = rawValue; continue; }
            if (sysKey === 'semat') { semat = rawValue; continue; }
            if (sysKey === 'level') { level = rawValue; continue; }
            
            // فیلدهای عددی
            let value = getNumber(rawValue);
            
            // تبدیل ۳۱ روزه به ۳۰ روزه
            if (sysKey === 'base_pay' && mapping.is31Day && isFirstHalf) {
                value = (value / 31) * 30;
            }
            
            // جمع مقادیر (برای فیلدهای چندتایی)
            if (record.raw_inputs.hasOwnProperty(sysKey)) {
                record.raw_inputs[sysKey] += value;
            }
        }
        
        // اعتبارسنجی
        if (!fname || !lname) return null;
        
        const { raw_inputs: raw, calculated_values: calc } = record;
        
        // محاسبات
        calc.total_statutory_benefits = raw.housing + raw.children + raw.worker_bonus + raw.seniority + raw.marital;
        calc.subtotal_statutory_pay = raw.base_pay + calc.total_statutory_benefits;
        calc.gross_no_mission = calc.subtotal_statutory_pay + raw.overtime + raw.shift_pay + raw.bonus + raw.transportation + raw.food_allowance + raw.other_payment;
        calc.gross_with_mission = calc.gross_no_mission + raw.mission;
        const total_deductions = raw.deduction_insurance + raw.deduction_tax + raw.other_deduction;
        calc.net_no_mission = calc.gross_no_mission - total_deductions;
        calc.net_with_mission = calc.gross_with_mission - total_deductions;
        
        // ساخت رکورد نهایی
        const finalRecord = {
            year: parseInt(record.year),
            month: record.month,
            company: record.company,
            fname,
            lname,
            semat,
            level,
            base_pay_30: raw.base_pay,
            allowance_30: calc.subtotal_statutory_pay,
            bonus: raw.bonus,
            overtime_amount: raw.overtime,
            gross_no_mission: calc.gross_no_mission,
            gross_with_mission: calc.gross_with_mission,
            net_no_mission: calc.net_no_mission,
            net_with_mission: calc.net_with_mission,
        };
        
        // ساخت کلید یکتا
        finalRecord.key = `${normalizeText(finalRecord.company)}-${normalizeText(fname)}-${normalizeText(lname)}`;
        finalRecord.uniqueRecordId = `${finalRecord.key}-${record.year}-${monthsMap[record.month]}`;
        
        // محاسبه ساعت اضافه‌کار
        finalRecord.overtime_hours = finalRecord.base_pay_30 > 0 
            ? Math.round(finalRecord.overtime_amount / ((finalRecord.base_pay_30 / 192) * 1.4)) 
            : 0;
        
        return finalRecord;
    }).filter(Boolean);
}

// ========== COMPLETE SECTION 16: CONFLICT MANAGEMENT ==========

/**
 * باز کردن مدال مدیریت تداخل‌ها
 */
function openConflictModal(newRecords) {
    const modal = document.getElementById('conflictModal');
    if (!modal) return;
    
    const container = document.getElementById('conflictListContainer');
    const counter = document.getElementById('conflictCounter');
    
    // ذخیره رکوردهای جدید (بدون تداخل)
    modal.dataset.newRecords = JSON.stringify(newRecords);
    
    if (container) container.innerHTML = '';
    if (counter) counter.textContent = `${conflictList.length} تداخل یافت شد`;
    
    const fieldsToCompare = {
        base_pay_30: 'حقوق پایه',
        allowance_30: 'مزایا',
        bonus: 'کارانه',
        net_no_mission: 'خالص (بدون ماموریت)'
    };
    
    conflictList.forEach((conflict, index) => {
        const item = document.createElement('div');
        item.className = 'conflict-item';
        item.id = `conflict-${index}`;
        
        const renderVersion = (version, title) => {
            let html = `<h6>${title}</h6><ul>`;
            for (const key in fieldsToCompare) {
                const value = formatPersianNumber(version[key]);
                html += `<li><span class="key">${fieldsToCompare[key]}:</span> <span class="value">${value}</span></li>`;
            }
            html += '</ul>';
            return html;
        };
        
        item.innerHTML = `
            <div class="conflict-item-header">
                <h5>${conflict.new.fname} ${conflict.new.lname} - ${conflict.new.month} ${conflict.new.year}</h5>
                <div class="resolution-status" id="status-${index}">هنوز تصمیم گرفته نشده</div>
            </div>
            <div class="conflict-item-body">
                <div class="conflict-version">${renderVersion(conflict.old, 'نسخه قدیمی (موجود در سیستم)')}</div>
                <div class="conflict-version">${renderVersion(conflict.new, 'نسخه جدید (از فایل اکسل)')}</div>
            </div>
            <div class="conflict-item-footer">
                <button class="btn-secondary" onclick="resolveConflict(${index}, 'keep')">نگه داشتن نسخه قدیمی</button>
                <button class="btn-warning" onclick="resolveConflict(${index}, 'replace')">جایگزین کردن با نسخه جدید</button>
            </div>
        `;
        
        if (container) container.appendChild(item);
    });
    
    modal.style.display = 'block';
}

/**
 * حل تداخل برای یک رکورد
 */
function resolveConflict(index, resolution) {
    if (!conflictList[index]) return;
    
    conflictList[index].resolution = resolution;
    const statusEl = document.getElementById(`status-${index}`);
    const itemEl = document.getElementById(`conflict-${index}`);
    
    if (statusEl && itemEl) {
        if (resolution === 'keep') {
            statusEl.textContent = 'نسخه قدیمی نگه داشته شد';
            statusEl.className = 'resolution-status status-kept';
            itemEl.style.borderColor = 'var(--success-color)';
        } else {
            statusEl.textContent = 'با نسخه جدید جایگزین می‌شود';
            statusEl.className = 'resolution-status status-replaced';
            itemEl.style.borderColor = 'var(--warning-color)';
        }
    }
}

/**
 * حل همه تداخل‌ها با یک تصمیم
 */
function resolveAllConflicts(resolution) {
    conflictList.forEach((_, index) => resolveConflict(index, resolution));
}

/**
 * اتمام و اعمال تصمیمات
 */
function finishConflictResolution() {
    showLoading('در حال اعمال تغییرات نهایی...');
    
    setTimeout(() => {
        let replacedCount = 0;
        let keptCount = 0;
        
        const modal = document.getElementById('conflictModal');
        const newRecords = JSON.parse(modal?.dataset.newRecords || '[]');
        
        const recordsToReplace = new Map();
        
        conflictList.forEach(conflict => {
            if (conflict.resolution === 'replace') {
                recordsToReplace.set(conflict.old.uniqueRecordId, conflict.new);
                replacedCount++;
            } else {
                keptCount++;
            }
        });
        
        // انتخاب داده هدف
        const targetData = currentFileType === 'salary' ? globalMonthlyData : globalAdHocData;
        
        // فیلتر کردن رکوردهای قدیمی که جایگزین می‌شوند
        let updatedData = targetData.filter(record => !recordsToReplace.has(record.uniqueRecordId));
        
        // افزودن رکوردهای جدید (بدون تداخل)
        updatedData.push(...newRecords);
        
        // افزودن رکوردهای جایگزین
        updatedData.push(...Array.from(recordsToReplace.values()));
        
        // به‌روزرسانی داده‌های سراسری
        if (currentFileType === 'salary') {
            globalMonthlyData = updatedData;
        } else {
            globalAdHocData = updatedData;
        }
        
        saveDataToStorage();
        
        // به‌روزرسانی پروفایل‌ها
        employeeProfiles = buildEmployeeProfiles(globalMonthlyData, globalAdHocData);
        
        // بستن مدال
        if (modal) modal.style.display = 'none';
        
        alert(`عملیات با موفقیت انجام شد.\n- ${newRecords.length} رکورد کاملاً جدید اضافه شد.\n- ${replacedCount} رکورد جایگزین شد.\n- ${keptCount} رکورد قدیمی حفظ شد.`);
        
        initializeApp(true);
        hideLoading();
    }, 50);
}

// ========== SECTION 17: EVENT LISTENERS ==========
function setupEventListeners() {
    // Tab navigation
    const btnSalary = document.getElementById('btn-salary');
    const btnAdhoc = document.getElementById('btn-adhoc');
    const btnReports = document.getElementById('btn-reports');
    
    if (btnSalary) btnSalary.addEventListener('click', () => showTab('salary'));
    if (btnAdhoc) btnAdhoc.addEventListener('click', () => showTab('adhoc'));
    if (btnReports) btnReports.addEventListener('click', () => showTab('reports'));
    
    // Salary tab
    const salaryFileInput = document.getElementById('salaryFileInput');
    if (salaryFileInput) {
        salaryFileInput.addEventListener('change', (e) => {
            currentFileType = 'salary';
            openMappingModal(e);
        });
    }
    
    const filterSalaryLname = document.getElementById('filterSalaryLname');
    const filterSalaryCompany = document.getElementById('filterSalaryCompany');
    const filterSalaryLevel = document.getElementById('filterSalaryLevel');
    const filterSalaryMonth = document.getElementById('filterSalaryMonth');
    const clearSalaryFilterBtn = document.getElementById('clearSalaryFilterBtn');
    
    if (filterSalaryLname) filterSalaryLname.addEventListener('keyup', applySalaryFilters);
    if (filterSalaryCompany) filterSalaryCompany.addEventListener('change', applySalaryFilters);
    if (filterSalaryLevel) filterSalaryLevel.addEventListener('change', applySalaryFilters);
    if (filterSalaryMonth) filterSalaryMonth.addEventListener('change', applySalaryFilters);
    if (clearSalaryFilterBtn) clearSalaryFilterBtn.addEventListener('click', resetSalaryFilters);
    
    document.querySelectorAll('#salaryTable thead th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => sortSalaryTable(th.dataset.sortKey));
    });
    
    // Salary compliance filter
    const salaryComplianceFilterBtn = document.getElementById('salaryComplianceFilterBtn');
    const salaryComplianceDropdown = document.getElementById('salaryComplianceDropdown');
    
    if (salaryComplianceFilterBtn && salaryComplianceDropdown) {
        salaryComplianceFilterBtn.addEventListener('click', () => {
            salaryComplianceDropdown.classList.toggle('show');
            salaryComplianceFilterBtn.classList.toggle('active');
        });
        
        salaryComplianceDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    item.classList.toggle('selected', checkbox.checked);
                    updateSalaryComplianceFilterText();
                    applySalaryFilters();
                }
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!salaryComplianceFilterBtn.contains(e.target) && !salaryComplianceDropdown.contains(e.target)) {
                salaryComplianceDropdown.classList.remove('show');
                salaryComplianceFilterBtn.classList.remove('active');
            }
        });
    }
    
    // Ad-hoc tab
    const btnSingleAdHocPayment = document.getElementById('btnSingleAdHocPayment');
    const adhocFileInput = document.getElementById('adhocFileInput');
    
    if (btnSingleAdHocPayment) {
        btnSingleAdHocPayment.addEventListener('click', openSingleAdHocModal);
    }
    
    if (adhocFileInput) {
        adhocFileInput.addEventListener('change', (e) => {
            currentFileType = 'adhoc';
            openMappingModal(e);
        });
    }
    
    const filterAdHocLname = document.getElementById('filterAdHocLname');
    const filterAdHocCompany = document.getElementById('filterAdHocCompany');
    const filterAdHocType = document.getElementById('filterAdHocType');
    const filterAdHocMonth = document.getElementById('filterAdHocMonth');
    const filterAdHocYear = document.getElementById('filterAdHocYear');
    const clearAdHocFilterBtn = document.getElementById('clearAdHocFilterBtn');
    
    if (filterAdHocLname) filterAdHocLname.addEventListener('keyup', applyAdHocFilters);
    if (filterAdHocCompany) filterAdHocCompany.addEventListener('change', applyAdHocFilters);
    if (filterAdHocType) filterAdHocType.addEventListener('change', applyAdHocFilters);
    if (filterAdHocMonth) filterAdHocMonth.addEventListener('change', applyAdHocFilters);
    if (filterAdHocYear) filterAdHocYear.addEventListener('change', applyAdHocFilters);
    if (clearAdHocFilterBtn) clearAdHocFilterBtn.addEventListener('click', resetAdHocFilters);
    
    document.querySelectorAll('#adhocTable thead th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => sortAdHocTable(th.dataset.sortKey));
    });
    
    // Ad-hoc modal
    const closeSingleAdHocModalBtn = document.getElementById('closeSingleAdHocModal');
    const cancelAdHocBtn = document.getElementById('cancelAdHocBtn');
    const saveAdHocBtn = document.getElementById('saveAdHocBtn');
    const addAdhocCompanyBtn = document.getElementById('addAdhocCompanyBtn');
    const addAdhocTypeBtn = document.getElementById('addAdhocTypeBtn');
    
    if (closeSingleAdHocModalBtn) closeSingleAdHocModalBtn.addEventListener('click', closeSingleAdHocModal);
    if (cancelAdHocBtn) cancelAdHocBtn.addEventListener('click', closeSingleAdHocModal);
    if (saveAdHocBtn) saveAdHocBtn.addEventListener('click', saveAdHocPayment);
    if (addAdhocCompanyBtn) addAdhocCompanyBtn.addEventListener('click', addNewAdHocCompany);
    if (addAdhocTypeBtn) addAdhocTypeBtn.addEventListener('click', addNewPaymentType);
    
    // Data management
    const limitsFileInput = document.getElementById('limitsFileInput');
    const importFileInput = document.getElementById('importFileInput');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    if (limitsFileInput) limitsFileInput.addEventListener('change', handleLimitsFile);
    if (importFileInput) importFileInput.addEventListener('change', handleJsonFile);
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearStoredData);
    
    // Note modal
    const noteModalSaveBtn = document.querySelector('#noteModal .btn-save');
    const noteModalCancelBtn = document.querySelector('#noteModal .btn-cancel');
    const noteModal = document.getElementById('noteModal');
    
    if (noteModalSaveBtn) noteModalSaveBtn.addEventListener('click', saveNote);
    if (noteModalCancelBtn) noteModalCancelBtn.addEventListener('click', closeNoteModal);
    if (noteModal) {
        noteModal.addEventListener('click', (e) => {
            if (e.target.id === 'noteModal') closeNoteModal();
        });
    }
    
    // Dossier modal
    const closeDossierBtn = document.getElementById('closeDossierBtn');
    const printDossierBtn = document.getElementById('printDossierBtn');
    const employeeDossierModal = document.getElementById('employeeDossierModal');
    
    if (closeDossierBtn) closeDossierBtn.addEventListener('click', closeEmployeeDossier);
    if (printDossierBtn) printDossierBtn.addEventListener('click', printDossier);
    if (employeeDossierModal) {
        employeeDossierModal.addEventListener('click', (e) => {
            if (e.target.id === 'employeeDossierModal') closeEmployeeDossier();
        });
    }
    
    // Mapping modal
    const closeMappingModalBtn = document.getElementById('closeMappingModal');
    const addNewCompanyBtn = document.getElementById('addNewCompanyBtn');
    const companySelect = document.getElementById('companySelect');
    const processMappingBtn = document.getElementById('processMappingBtn');
    
    if (closeMappingModalBtn) closeMappingModalBtn.addEventListener('click', closeMappingModal);
    if (addNewCompanyBtn) addNewCompanyBtn.addEventListener('click', addNewCompany);
    if (companySelect) companySelect.addEventListener('change', loadMappingProfileForCompany);
    if (processMappingBtn) processMappingBtn.addEventListener('click', processAndImportData);
    
    // Conflict modal
    const finishConflictResolutionBtn = document.getElementById('finishConflictResolution');
    const resolveKeepAllBtn = document.getElementById('resolveKeepAll');
    const resolveReplaceAllBtn = document.getElementById('resolveReplaceAll');
    
    if (finishConflictResolutionBtn) {
        finishConflictResolutionBtn.addEventListener('click', finishConflictResolution);
    }
    if (resolveKeepAllBtn) {
        resolveKeepAllBtn.addEventListener('click', () => resolveAllConflicts('keep'));
    }
    if (resolveReplaceAllBtn) {
        resolveReplaceAllBtn.addEventListener('click', () => resolveAllConflicts('replace'));
    }
}

// ========== SECTION 18: GLOBAL EXPORTS ==========
// Make functions globally accessible for inline onclick handlers
window.openEmployeeDossier = openEmployeeDossier;
window.openNoteModal = openNoteModal;
window.toggleDossierLegendItem = toggleDossierLegendItem;
window.resolveConflict = resolveConflict;

// ========== END OF SCRIPT ==========
console.log('💼 Payroll & Ad-Hoc Payments System Loaded Successfully');