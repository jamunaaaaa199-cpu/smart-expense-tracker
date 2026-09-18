
// =========================================================
// STARTING MEDIA ANIMATION & DELETE MODAL CONTROLLERS
// =========================================================
function initStartingAnimation() {
    let splash = document.getElementById('appSplashLoader');
    if (!splash) {
        const splashHtml = `
            <div id="appSplashLoader" class="app-splash-screen">
                <div class="splash-card">
                    <div class="splash-logo-wrap">
                        <img src="favicon.svg" class="splash-logo" alt="Smart Expense Tracker">
                        <div class="splash-pulse-ring"></div>
                    </div>
                    <h3 class="splash-title">Smart<span class="text-primary">Expense</span></h3>
                    <p class="splash-tagline">Intelligent Financial Architecture</p>
                    <div class="splash-progress-bar">
                        <div class="splash-progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', splashHtml);
        splash = document.getElementById('appSplashLoader');
    }

    setTimeout(() => {
        if (splash) {
            splash.classList.add('splash-hidden');
            setTimeout(() => splash.remove(), 500);
        }
    }, 600);
}

// Modern Delete Confirmation Modal (Replaces browser popups)
window.showDeleteConfirmation = function(message, onConfirm) {
    let modalEl = document.getElementById('deleteConfirmModal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content border-0 shadow-lg rounded-4 text-center p-3">
                        <div class="modal-body">
                            <div class="text-danger mb-2" style="font-size: 2.75rem;">⚠️</div>
                            <h5 class="fw-bold text-dark mb-1">Confirm Deletion</h5>
                            <p class="text-muted small mb-4" id="deleteConfirmMessage">Are you sure you want to permanently delete this transaction? This action cannot be undone.</p>
                            <div class="d-flex justify-content-center gap-2">
                                <button type="button" class="btn btn-sm btn-light px-3 fw-semibold" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-sm btn-danger px-4 fw-semibold" id="confirmDeleteBtn">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('deleteConfirmModal');
    }

    if (message) {
        document.getElementById('deleteConfirmMessage').textContent = message;
    }

    const btn = document.getElementById('confirmDeleteBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async () => {
        newBtn.disabled = true;
        newBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting...';
        try {
            await onConfirm();
            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();
        } finally {
            newBtn.disabled = false;
            newBtn.innerHTML = '<i class="bi bi-trash-fill me-1"></i> Yes, Delete';
        }
    });

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

// Bulletproof HTML Entity Escaping (Zero-XSS Protection)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =========================================================
// Smart Expense Tracker - Master UI & Application Controller
// Version 2.1 - 4-Stage Budget Warning & Mobile/Desktop Engine
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    initStartingAnimation();
    registerServiceWorker();
    setupCommonUI();
    initCurrentPage();
});

// PWA Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
}

// Toast Notification Helper
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Category Badge Color Helper
function getCategoryBadge(category, type = 'Expense') {
    const cat = (category || 'Other').toLowerCase();
    let badgeClass = 'badge-other';

    if (cat.includes('food') || cat.includes('restaurant')) badgeClass = 'badge-food';
    else if (cat.includes('travel') || cat.includes('fuel')) badgeClass = 'badge-travel';
    else if (cat.includes('shopping') || cat.includes('clothes')) badgeClass = 'badge-shopping';
    else if (cat.includes('bill') || cat.includes('electricity')) badgeClass = 'badge-bills';
    else if (cat.includes('salary')) badgeClass = 'badge-salary';
    else if (cat.includes('business')) badgeClass = 'badge-business';
    else if (cat.includes('investment') || cat.includes('dividend')) badgeClass = 'badge-investment';

    return `<span class="badge-category ${badgeClass}">${category || 'General'}</span>`;
}

// Format Currency with Intl.NumberFormat (Point 11: Double Decimals ₹50.00)
function formatINR(val) {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(num);
}

// Point 8: Smart Auto-Categorization Helper
function setupSmartAutoCategorization(titleInputId, categorySelectId, type = 'expense') {
    const titleInput = document.getElementById(titleInputId);
    const categorySelect = document.getElementById(categorySelectId);
    if (!titleInput || !categorySelect) return;

    const expenseRules = [
        { cat: 'Food', keywords: ['swiggy', 'zomato', 'restaurant', 'mcdonald', 'kfc', 'cafe', 'starbucks', 'dinner', 'lunch', 'breakfast', 'tea', 'coffee', 'pizza', 'burger', 'grocery', 'blinkit', 'zepto', 'instamart', 'supermarket', 'fruits', 'veg'] },
        { cat: 'Travel', keywords: ['uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'flight', 'irctc', 'train', 'bus', 'auto', 'taxi', 'toll', 'parking', 'cab'] },
        { cat: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'cloth', 'shirt', 'shoes', 'mall', 'zara', 'h&m', 'purchase', 'dress', 'pant'] },
        { cat: 'Bills', keywords: ['electricity', 'water', 'wifi', 'broadband', 'airtel', 'jio', 'vi', 'recharge', 'rent', 'gas', 'cylinder', 'eb bill', 'power', 'maintenance', 'dth'] },
        { cat: 'Entertainment', keywords: ['netflix', 'spotify', 'movie', 'cinema', 'hotstar', 'prime', 'game', 'steam', 'concert', 'theatre', 'show'] },
        { cat: 'Healthcare', keywords: ['medicine', 'hospital', 'doctor', 'pharmacy', 'apollo', '1mg', 'clinic', 'dentist', 'lab', 'test', 'health'] },
        { cat: 'Education', keywords: ['fee', 'tuition', 'course', 'udemy', 'coursera', 'books', 'school', 'college', 'exam'] }
    ];

    const incomeRules = [
        { cat: 'Salary', keywords: ['salary', 'payroll', 'wages', 'stipend', 'bonus', 'paycheck'] },
        { cat: 'Business', keywords: ['client', 'freelance', 'project', 'invoice', 'sale', 'consulting', 'customer', 'contract'] },
        { cat: 'Investments', keywords: ['dividend', 'mutual fund', 'stock', 'crypto', 'interest', 'shares', 'trading', 'profit', 'equity'] }
    ];

    const rules = type === 'income' ? incomeRules : expenseRules;

    titleInput.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase().trim();
        if (!text) return;
        
        for (const rule of rules) {
            const matched = rule.keywords.some(kw => text.includes(kw));
            if (matched) {
                const options = Array.from(categorySelect.options);
                const foundOpt = options.find(opt => opt.value.toLowerCase() === rule.cat.toLowerCase());
                if (foundOpt && categorySelect.value !== foundOpt.value) {
                    categorySelect.value = foundOpt.value;
                    categorySelect.classList.add('border-primary', 'shadow-sm');
                    setTimeout(() => categorySelect.classList.remove('border-primary', 'shadow-sm'), 1200);
                }
                break;
            }
        }
    });
}

// Point 9: AI Spending Velocity & Month-End Projection Engine
function renderSmartAIInsights(stats, containerId = 'smartAIInsightsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const now = new Date();
    const currentDay = Math.max(now.getDate(), 1);
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(totalDaysInMonth - currentDay, 0);

    const totalExpense = Number(stats.totalExpense || 0);
    const budgetAmount = Number(stats.budgetAmount || 40000);
    const dailyVelocity = totalExpense / currentDay;
    const projectedSpend = totalExpense + (dailyVelocity * remainingDays);
    const projectedRatio = budgetAmount > 0 ? (projectedSpend / budgetAmount) * 100 : 0;

    let healthBadge = '';
    let healthColor = '';
    let healthAdvice = '';

    if (projectedRatio > 100) {
        healthBadge = '⚠️ High Velocity - Overspend Projected';
        healthColor = 'border-danger bg-danger-subtle text-danger-emphasis';
        const over = projectedSpend - budgetAmount;
        healthAdvice = `At your current velocity of <strong>${formatINR(dailyVelocity)}/day</strong>, your projected expenditure will reach <strong>${formatINR(projectedSpend)}</strong> by month-end, exceeding your target budget by <strong>${formatINR(over)}</strong>. Reduce discretionary shopping and dining.`;
    } else if (projectedRatio > 80) {
        healthBadge = '⚡ Moderate Pace - Near Limit';
        healthColor = 'border-warning bg-warning-subtle text-warning-emphasis';
        healthAdvice = `You are spending an average of <strong>${formatINR(dailyVelocity)}/day</strong>. Projected month-end spend is <strong>${formatINR(projectedSpend)}</strong> (${Math.round(projectedRatio)}% of budget). Monitor upcoming subscriptions and bills.`;
    } else {
        healthBadge = '✨ Healthy Spending Pace';
        healthColor = 'border-success bg-success-subtle text-success-emphasis';
        healthAdvice = `Great financial discipline! Your daily velocity of <strong>${formatINR(dailyVelocity)}/day</strong> puts your projected month-end total at <strong>${formatINR(projectedSpend)}</strong>, safely within your <strong>${formatINR(budgetAmount)}</strong> target.`;
    }

    container.innerHTML = `
        <div class="card card-modern border ${healthColor} mb-4 shadow-sm">
            <div class="card-body p-3 p-md-4">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fs-4">🤖</span>
                        <h6 class="fw-bold mb-0">Smart AI Financial Velocity & Forecasting</h6>
                    </div>
                    <span class="badge ${projectedRatio > 100 ? 'bg-danger' : projectedRatio > 80 ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill">
                        ${healthBadge}
                    </span>
                </div>
                <p class="small mb-3 text-secondary">${healthAdvice}</p>
                <div class="row g-2 text-center pt-2 border-top">
                    <div class="col-4">
                        <div class="small text-muted">Daily Burn Rate</div>
                        <div class="fw-bold text-dark">${formatINR(dailyVelocity)}<span class="small text-muted">/day</span></div>
                    </div>
                    <div class="col-4">
                        <div class="small text-muted">Month-End Projection</div>
                        <div class="fw-bold ${projectedRatio > 100 ? 'text-danger' : 'text-primary'}">${formatINR(projectedSpend)}</div>
                    </div>
                    <div class="col-4">
                        <div class="small text-muted">Days Left in Month</div>
                        <div class="fw-bold text-dark">${remainingDays} days</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Point 6: Universal Transaction Edit Modal (Income & Expenses)
window.openEditTransactionModal = function({ type, item, onSave }) {
    let modalEl = document.getElementById('editTransactionModal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade" id="editTransactionModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold" id="editModalTitle">✏️ Edit Record</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="editTransactionForm">
                                <input type="hidden" id="editItemId">
                                <input type="hidden" id="editItemType">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold" id="editTitleLabel">Title *</label>
                                    <input type="text" id="editTitleInput" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Category *</label>
                                    <select id="editCategorySelect" class="form-select" required></select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Amount (₹) *</label>
                                    <input type="number" id="editAmountInput" class="form-control" step="0.01" min="0.01" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Date *</label>
                                    <input type="date" id="editDateInput" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Description / Notes</label>
                                    <textarea id="editDescInput" class="form-control" rows="2"></textarea>
                                </div>
                                <div class="d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary px-4 fw-semibold" id="saveEditBtn">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('editTransactionModal');
    }

    const isIncome = type === 'income';
    document.getElementById('editModalTitle').innerHTML = isIncome ? '✏️ Edit Income Entry' : '✏️ Edit Expense Record';
    document.getElementById('editTitleLabel').textContent = isIncome ? 'Income Source *' : 'Expense Title *';
    document.getElementById('editItemId').value = item.income_id || item.expense_id || item.id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editTitleInput').value = isIncome ? (item.source || '') : (item.title || '');
    document.getElementById('editAmountInput').value = item.amount;
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('editDateInput');
    dateInput.max = today;
    dateInput.value = (isIncome ? item.income_date : item.expense_date) || today;
    document.getElementById('editDescInput').value = item.description || '';

    const catSelect = document.getElementById('editCategorySelect');
    const categories = isIncome 
        ? ['Salary', 'Freelance', 'Business', 'Investments', 'Gift', 'Rental', 'Other']
        : ['Food', 'Travel', 'Shopping', 'Bills', 'Healthcare', 'Entertainment', 'Education', 'Others'];
    
    catSelect.innerHTML = categories.map(c => `<option value="${c}" ${c.toLowerCase() === (item.category || '').toLowerCase() ? 'selected' : ''}>${c}</option>`).join('');

    const form = document.getElementById('editTransactionForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('editTitleInput').value.trim();
        const catVal = document.getElementById('editCategorySelect').value;
        const amtVal = parseFloat(document.getElementById('editAmountInput').value);
        const dateVal = document.getElementById('editDateInput').value;
        const descVal = document.getElementById('editDescInput').value.trim();

        if (!titleVal) {
            showToast('Title / Source cannot be empty or spaces.', 'warning');
            return;
        }
        if (isNaN(amtVal) || amtVal <= 0) {
            showToast('Amount must be greater than ₹0.00.', 'warning');
            return;
        }
        if (amtVal > 10000000.00) {
            showToast('Amount cannot exceed ₹10,000,000.00.', 'warning');
            return;
        }
        if (dateVal > today) {
            showToast('Transaction date cannot be in the future.', 'warning');
            return;
        }

        const id = document.getElementById('editItemId').value;
        const updatedData = isIncome 
            ? { source: titleVal, category: catVal, amount: amtVal, income_date: dateVal, description: descVal }
            : { title: titleVal, category: catVal, amount: amtVal, expense_date: dateVal, description: descVal };

        const submitBtn = newForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
        }

        try {
            await onSave(id, updatedData);
            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
            }
        }
    });

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

// Common UI (active navbar, mobile bottom navigation, user greeting)
function setupCommonUI() {
    const user = API.getUser();
    const userDisplay = document.getElementById('navUserDisplay');
    if (userDisplay && user) {
        userDisplay.textContent = user.full_name || 'Demo User';
    }

    const path = window.location.pathname.split('/').pop() || 'index.html';
    
    // Top Navbar Active
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === path || (path === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Mobile Bottom Nav Active
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(link => {
        const href = link.getAttribute('href');
        if (href === path || (path === '' && href === 'dashboard.html')) {
            link.classList.add('active');
        }
    });
}

// =========================================================
// 4-STAGE BUDGET THRESHOLD WARNING ENGINE
// (50%, 75%, 90%, 100% Thresholds)
// =========================================================
function renderBudgetAlerts(spentPercent, totalExpense, budgetAmount, containerId = 'budgetAlertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const remaining = Math.max(budgetAmount - totalExpense, 0);
    const overspent = Math.max(totalExpense - budgetAmount, 0);

    let alertHtml = '';

    if (spentPercent >= 100) {
        // Stage 4: 100%+ Limit Exhausted
        alertHtml = `
            <div class="budget-alert-card alert-stage-100">
                <div class="alert-icon-wrap">⛔</div>
                <div class="alert-content">
                    <div class="alert-title">
                        <span>STAGE 4 CRITICAL: Monthly Budget 100% Exhausted!</span>
                    </div>
                    <div class="alert-desc">
                        You have fully consumed your designated budget limit of <strong>${formatINR(budgetAmount)}</strong>. 
                        ${overspent > 0 ? `Current expenditure exceeds budget threshold by <strong>${formatINR(overspent)}</strong>.` : 'Zero safe spending balance remains.'}
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="alert-stat-badge">Consumed: ${spentPercent}%</span>
                        <span class="alert-stat-badge ${overspent > 0 ? 'bg-danger text-white' : ''}">${overspent > 0 ? `Overspent: -${formatINR(overspent)}` : 'Remaining Balance: ₹0.00'}</span>
                        <button class="btn btn-sm btn-light py-0 px-2 fw-bold" onclick="openBudgetModal()">
                            <i class="bi bi-pencil-square me-1"></i> Adjust Budget Limit
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else if (spentPercent >= 90) {
        // Stage 3: 90% Critical Alert
        alertHtml = `
            <div class="budget-alert-card alert-stage-90">
                <div class="alert-icon-wrap">🚨</div>
                <div class="alert-content">
                    <div class="alert-title">
                        <span>STAGE 3 ALERT: 90% Budget Limit Reached!</span>
                    </div>
                    <div class="alert-desc">
                        Urgent financial notice: You have utilized <strong>${spentPercent}%</strong> of your credited monthly budget. 
                        Only <strong>${formatINR(remaining)}</strong> remains before your limit is exhausted.
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="alert-stat-badge">Spent: ${formatINR(totalExpense)} / ${formatINR(budgetAmount)}</span>
                        <span class="alert-stat-badge">Safe Balance: ${formatINR(remaining)}</span>
                        <button class="btn btn-sm btn-danger py-0 px-2 fw-bold" onclick="openBudgetModal()">Adjust Limit</button>
                    </div>
                </div>
            </div>
        `;
    } else if (spentPercent >= 75) {
        // Stage 2: 75% Caution Warning
        alertHtml = `
            <div class="budget-alert-card alert-stage-75">
                <div class="alert-icon-wrap">⚠️</div>
                <div class="alert-content">
                    <div class="alert-title">
                        <span>STAGE 2 WARNING: 75% Budget Limit Consumed</span>
                    </div>
                    <div class="alert-desc">
                        Caution: You have crossed the <strong>${spentPercent}%</strong> milestone of your spending allowance. 
                        Consider slowing down non-essential expenses. Safe remaining balance: <strong>${formatINR(remaining)}</strong>.
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="alert-stat-badge">Utilization: ${spentPercent}%</span>
                        <span class="alert-stat-badge">Remaining Balance: ${formatINR(remaining)}</span>
                    </div>
                </div>
            </div>
        `;
    } else if (spentPercent >= 50) {
        // Stage 1: 50% Informational Notice
        alertHtml = `
            <div class="budget-alert-card alert-stage-50">
                <div class="alert-icon-wrap">💡</div>
                <div class="alert-content">
                    <div class="alert-title">
                        <span>STAGE 1 NOTICE: 50% Halfway Spending Milestone</span>
                    </div>
                    <div class="alert-desc">
                        You have utilized <strong>${spentPercent}%</strong> of your monthly financial budget. 
                        You have <strong>${formatINR(remaining)}</strong> remaining safe spend for the rest of the period.
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="alert-stat-badge">Total Spent: ${formatINR(totalExpense)}</span>
                        <span class="alert-stat-badge">Remaining Balance: ${formatINR(remaining)}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = alertHtml;
}

// Budget Modal Helper
window.openBudgetModal = function() {
    let modalEl = document.getElementById('budgetModal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade" id="budgetModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title fw-bold">🎯 Configure Monthly Budget Limit</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <p class="text-muted small">
                                Adjust your monthly spending target. The 4-stage warning notifications (50%, 75%, 90%, 100%) will recalculate immediately.
                            </p>
                            <form id="budgetSettingForm">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Monthly Budget Amount (₹)</label>
                                    <input type="number" id="inputNewBudget" class="form-control form-control-lg" placeholder="e.g. 40000" min="100" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold">Save Budget Target</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('budgetModal');

        document.getElementById('budgetSettingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const val = parseFloat(document.getElementById('inputNewBudget').value);
            if (isNaN(val) || val <= 0) {
                showToast('Budget must be a positive number greater than ₹0.00.', 'warning');
                return;
            }
            if (val > 10000000.00) {
                showToast('Budget target cannot exceed ₹10,000,000.00.', 'warning');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
            }

            try {
                await API.updateBudget(val);
                showToast('Budget target updated successfully!');
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
                initDashboard();
            } catch (err) {
                showToast('Failed to update budget.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Save Budget Target';
                }
            }
        });
    }

    const currentBudget = document.getElementById('budgetTotal')?.innerText.replace(/[^0-9]/g, '') || 40000;
    const inputEl = document.getElementById('inputNewBudget');
    if (inputEl) inputEl.value = currentBudget;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

// Page Router
function initCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';

    if (path === 'dashboard.html') {
        initDashboard();
    } else if (path === 'income.html') {
        initIncomePage();
    } else if (path === 'expenses.html' || path === 'expense.html') {
        initExpensesPage();
    } else if (path === 'reports.html') {
        initReportsPage();
    } else if (path === 'login.html') {
        initLoginPage();
    } else if (path === 'register.html') {
        initRegisterPage();
    } else if (path === 'logout.html' || path === 'logoutt.html') {
        initLogoutPage();
    }
}

// =========================================================
// DASHBOARD PAGE
// =========================================================
async function initDashboard() {
    const incomeEl = document.getElementById('totalIncome');
    const expenseEl = document.getElementById('totalExpense');
    const balanceEl = document.getElementById('currentBalance');
    const budgetTotalEl = document.getElementById('budgetTotal');
    const budgetSpentEl = document.getElementById('budgetSpent');
    const budgetRemainingEl = document.getElementById('budgetRemaining');
    const progressBar = document.getElementById('budgetProgressBar');
    const txTableBody = document.getElementById('recentTransactionsBody');

    try {
        const stats = await API.getDashboardStats();

        if (incomeEl) incomeEl.innerText = formatINR(stats.totalIncome);
        if (expenseEl) expenseEl.innerText = formatINR(stats.totalExpense);
        if (balanceEl) balanceEl.innerText = formatINR(stats.balance);

        if (budgetTotalEl) budgetTotalEl.innerText = formatINR(stats.budgetAmount);
        if (budgetSpentEl) budgetSpentEl.innerText = formatINR(stats.totalExpense);
        if (budgetRemainingEl) budgetRemainingEl.innerText = formatINR(stats.remainingBudget);

        if (progressBar) {
            progressBar.style.width = `${Math.min(stats.spentPercent, 100)}%`;
            progressBar.innerText = `${stats.spentPercent}%`;

            if (stats.spentPercent >= 100) {
                progressBar.className = 'progress-bar bg-dark';
            } else if (stats.spentPercent >= 90) {
                progressBar.className = 'progress-bar bg-danger';
            } else if (stats.spentPercent >= 75) {
                progressBar.className = 'progress-bar bg-warning text-dark';
            } else if (stats.spentPercent >= 50) {
                progressBar.className = 'progress-bar bg-info';
            } else {
                progressBar.className = 'progress-bar bg-success';
            }
        }

        // Render 4-Stage Warning Alerts
        renderBudgetAlerts(stats.spentPercent, stats.totalExpense, stats.budgetAmount, 'budgetAlertContainer');

        // Render Point 9: Smart AI Financial Velocity & Forecasting
        renderSmartAIInsights(stats, 'smartAIInsightsContainer');

        if (txTableBody) {
            if (!stats.recentTransactions || stats.recentTransactions.length === 0) {
                txTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No recent transactions recorded.</td></tr>`;
            } else {
                txTableBody.innerHTML = stats.recentTransactions.map(tx => `
                    <tr>
                        <td><strong>${escapeHtml(tx.date)}</strong></td>
                        <td>${getCategoryBadge(escapeHtml(tx.category), escapeHtml(tx.type))}</td>
                        <td>${escapeHtml(tx.title)}</td>
                        <td class="${tx.type === 'Income' ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                            ${tx.type === 'Income' ? '+' : '-'} ${formatINR(tx.amount)}
                        </td>
                        <td>
                            <span class="badge ${tx.type === 'Income' ? 'bg-success' : 'bg-danger'}">
                                ${escapeHtml(tx.type)}
                            </span>
                        </td>
                        <td class="text-end text-nowrap">
                            <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="handleEditRecent('${escapeHtml(tx.id)}', '${escapeHtml(tx.type)}')" title="Edit ${escapeHtml(tx.type)}" aria-label="Edit ${escapeHtml(tx.type)}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="handleDeleteRecent('${escapeHtml(tx.id)}', '${escapeHtml(tx.type)}')" title="Delete ${escapeHtml(tx.type)}" aria-label="Delete ${escapeHtml(tx.type)}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

// Handler for Editing Recent Transactions directly from Dashboard
window.handleEditRecent = async function(id, type) {
    if (type === 'Income') {
        const items = await API.getIncome();
        const item = items.find(i => String(i.income_id) === String(id) || String(i.id) === String(id));
        if (!item) {
            showToast('Income record not found.', 'error');
            return;
        }
        openEditTransactionModal({
            type: 'income',
            item,
            onSave: async (savedId, data) => {
                try {
                    await API.updateIncome(savedId, data);
                    showToast('Income entry updated successfully!', 'success');
                    initDashboardPage();
                } catch (err) {
                    showToast('Failed to update income.', 'error');
                }
            }
        });
    } else {
        const items = await API.getExpenses();
        const item = items.find(e => String(e.expense_id) === String(id) || String(e.id) === String(id));
        if (!item) {
            showToast('Expense record not found.', 'error');
            return;
        }
        openEditTransactionModal({
            type: 'expense',
            item,
            onSave: async (savedId, data) => {
                try {
                    await API.updateExpense(savedId, data);
                    showToast('Expense record updated successfully!', 'success');
                    initDashboardPage();
                } catch (err) {
                    showToast('Failed to update expense.', 'error');
                }
            }
        });
    }
};

// Handler for Deleting Recent Transactions directly from Dashboard
window.handleDeleteRecent = async function(id, type) {
    window.showDeleteConfirmation(`Are you sure you want to permanently delete this ${type.toLowerCase()} record?`, async () => {
        try {
            if (type === 'Income') {
                await API.deleteIncome(id);
            } else {
                await API.deleteExpense(id);
            }
            showToast(`${type} record deleted successfully.`);
            initDashboardPage();
        } catch (err) {
            showToast(`Failed to delete ${type.toLowerCase()}.`, 'error');
        }
    });
};

// =========================================================
// INCOME PAGE
// =========================================================
async function initIncomePage() {
    const form = document.getElementById('incomeForm');
    const tableBody = document.getElementById('incomeTableBody');
    const searchInput = document.getElementById('searchIncome');
    const categorySelect = document.getElementById('filterCategory');
    const dateInput = document.getElementById('incomeDate');

    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.max = today;
        if (!dateInput.value) dateInput.value = today;
    }

    // Point 8: Smart Auto-Categorization for Income
    setupSmartAutoCategorization('incomeSource', 'incomeCategory', 'income');

    async function loadIncomeList() {
        const search = searchInput ? searchInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : '';

        const items = await API.getIncome({ search, category });
        if (!tableBody) return;

        if (items.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="empty-state text-center">
                            <i class="bi bi-wallet2 fs-1 text-primary d-block mb-2"></i>
                            <h6 class="fw-bold text-dark">No Income Records Found</h6>
                            <p class="text-muted small mb-0">Record an income stream using the form to see your balance grow.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(item.income_date)}</strong></td>
                <td>${escapeHtml(item.source)}</td>
                <td>${getCategoryBadge(escapeHtml(item.category), 'Income')}</td>
                <td class="text-success fw-bold">+ ${formatINR(item.amount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="handleEditIncome('${escapeHtml(item.income_id || index)}')" title="Edit Entry" aria-label="Edit Income Entry">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="handleDeleteIncome('${escapeHtml(item.income_id || index)}')" title="Delete Entry" aria-label="Delete Income Entry">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const source = document.getElementById('incomeSource')?.value.trim();
            const category = document.getElementById('incomeCategory')?.value;
            const amountVal = document.getElementById('incomeAmount')?.value;
            const income_date = document.getElementById('incomeDate')?.value;
            const description = document.getElementById('incomeDescription')?.value.trim() || '';

            // Strict Validation checks (Point 2, 3, 4)
            const sourceEl = document.getElementById('incomeSource');
            if (!source) {
                if (sourceEl) sourceEl.classList.add('is-invalid');
                showToast('Income source title cannot be empty or spaces.', 'warning');
                return;
            }
            if (sourceEl) sourceEl.classList.remove('is-invalid');

            const parsedAmount = parseFloat(amountVal);
            const amtEl = document.getElementById('incomeAmount');
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                if (amtEl) amtEl.classList.add('is-invalid');
                showToast('Income amount must be a positive number greater than ₹0.00.', 'warning');
                return;
            }
            if (parsedAmount > 10000000.00) {
                if (amtEl) amtEl.classList.add('is-invalid');
                showToast('Income amount cannot exceed ₹10,000,000.00.', 'warning');
                return;
            }
            if (amtEl) amtEl.classList.remove('is-invalid');

            if (!category || category === 'Select Category' || category === 'All') {
                showToast('Please select a valid income category.', 'warning');
                return;
            }

            if (income_date && income_date > today) {
                showToast('Income date cannot be in the future.', 'warning');
                return;
            }

            try {
                await API.addIncome({ source, category, amount: parsedAmount, income_date, description });
                showToast('Income added successfully!');
                form.reset();
                if (dateInput) dateInput.value = today;
                loadIncomeList();
            } catch (err) {
                showToast('Failed to add income.', 'error');
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => loadIncomeList());
    if (categorySelect) categorySelect.addEventListener('change', () => loadIncomeList());

    // Point 6: Edit Income Handler
    window.handleEditIncome = async function(id) {
        const items = await API.getIncome();
        const item = items.find(i => String(i.income_id) === String(id) || String(i.id) === String(id));
        if (!item) {
            showToast('Income record not found.', 'error');
            return;
        }
        openEditTransactionModal({
            type: 'income',
            item,
            onSave: async (savedId, data) => {
                try {
                    await API.updateIncome(savedId, data);
                    showToast('Income entry updated successfully!', 'success');
                    loadIncomeList();
                } catch (err) {
                    showToast('Failed to update income.', 'error');
                }
            }
        });
    };

    // Point 5: Delete Confirmation
    window.handleDeleteIncome = async function(id) {
        if (confirm('Are you sure you want to permanently delete this income entry?')) {
            await API.deleteIncome(id);
            showToast('Income entry deleted successfully.');
            loadIncomeList();
        }
    };

    loadIncomeList();
}

// =========================================================
// EXPENSES PAGE
// =========================================================
async function initExpensesPage() {
    const form = document.getElementById('expenseForm');
    const tableBody = document.getElementById('expenseTableBody');
    const searchInput = document.getElementById('searchExpense');
    const categorySelect = document.getElementById('filterExpenseCategory');
    const dateInput = document.getElementById('expenseDate');

    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.max = today;
        if (!dateInput.value) dateInput.value = today;
    }

    // Point 8: Smart Auto-Categorization for Expenses
    setupSmartAutoCategorization('expenseTitle', 'expenseCategory', 'expense');

    async function loadExpenseList() {
        const search = searchInput ? searchInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : '';

        const items = await API.getExpenses({ search, category });
        
        // Update budget alert on expenses page as well
        const stats = await API.getDashboardStats();
        renderBudgetAlerts(stats.spentPercent, stats.totalExpense, stats.budgetAmount, 'budgetAlertContainer');

        if (!tableBody) return;

        if (items.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-state text-center">
                            <i class="bi bi-receipt-cutoff fs-1 text-danger d-block mb-2"></i>
                            <h6 class="fw-bold text-dark">No Expenses Logged Yet</h6>
                            <p class="text-muted small mb-0">Record an expense using the form to monitor your monthly budget.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(item.expense_date)}</strong></td>
                <td>${escapeHtml(item.title)}</td>
                <td>${getCategoryBadge(escapeHtml(item.category), 'Expense')}</td>
                <td class="text-danger fw-bold">- ${formatINR(item.amount)}</td>
                <td class="text-muted small">${escapeHtml(item.description || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="handleEditExpense('${escapeHtml(item.expense_id || index)}')" title="Edit Expense" aria-label="Edit Expense">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="handleDeleteExpense('${escapeHtml(item.expense_id || index)}')" title="Delete Expense" aria-label="Delete Expense">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('expenseTitle')?.value.trim();
            const category = document.getElementById('expenseCategory')?.value;
            const amountVal = document.getElementById('expenseAmount')?.value;
            const expense_date = document.getElementById('expenseDate')?.value;
            const description = document.getElementById('expenseDescription')?.value.trim() || '';

            // Strict Validation checks (Point 2, 3, 4)
            const titleEl = document.getElementById('expenseTitle');
            if (!title) {
                if (titleEl) titleEl.classList.add('is-invalid');
                showToast('Expense title cannot be empty or spaces.', 'warning');
                return;
            }
            if (titleEl) titleEl.classList.remove('is-invalid');

            const parsedAmount = parseFloat(amountVal);
            const amtExpEl = document.getElementById('expenseAmount');
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                if (amtExpEl) amtExpEl.classList.add('is-invalid');
                showToast('Expense amount must be a positive number greater than ₹0.00.', 'warning');
                return;
            }
            if (parsedAmount > 10000000.00) {
                if (amtExpEl) amtExpEl.classList.add('is-invalid');
                showToast('Expense amount cannot exceed ₹10,000,000.00.', 'warning');
                return;
            }
            if (amtExpEl) amtExpEl.classList.remove('is-invalid');

            if (!category || category === 'Select Category' || category === 'All') {
                showToast('Please select a valid expense category.', 'warning');
                return;
            }

            if (expense_date && expense_date > today) {
                showToast('Expense date cannot be in the future.', 'warning');
                return;
            }

            try {
                await API.addExpense({ title, category, amount: parsedAmount, expense_date, description });
                showToast('Expense recorded successfully!');
                form.reset();
                if (dateInput) dateInput.value = today;
                loadExpenseList();
            } catch (err) {
                showToast('Failed to record expense.', 'error');
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => loadExpenseList());
    if (categorySelect) categorySelect.addEventListener('change', () => loadExpenseList());

    // Point 6: Edit Expense Handler
    window.handleEditExpense = async function(id) {
        const items = await API.getExpenses();
        const item = items.find(e => String(e.expense_id) === String(id) || String(e.id) === String(id));
        if (!item) {
            showToast('Expense record not found.', 'error');
            return;
        }
        openEditTransactionModal({
            type: 'expense',
            item,
            onSave: async (savedId, data) => {
                try {
                    await API.updateExpense(savedId, data);
                    showToast('Expense record updated successfully!', 'success');
                    loadExpenseList();
                } catch (err) {
                    showToast('Failed to update expense.', 'error');
                }
            }
        });
    };

    // Point 5: Delete Confirmation
    window.handleDeleteExpense = async function(id) {
        if (confirm('Are you sure you want to permanently delete this expense record?')) {
            await API.deleteExpense(id);
            showToast('Expense record deleted successfully.');
            loadExpenseList();
        }
    };

    loadExpenseList();
}

// =========================================================
// REPORTS & ANALYTICS PAGE
// =========================================================
let barChartInstance = null;
let pieChartInstance = null;

async function initReportsPage() {
    const monthFilter = document.getElementById('reportMonth');
    const categoryFilter = document.getElementById('reportCategory');
    const filterBtn = document.getElementById('applyFilterBtn');
    const exportBtn = document.getElementById('exportCsvBtn');

    const totalIncomeEl = document.getElementById('reportTotalIncome');
    const totalExpenseEl = document.getElementById('reportTotalExpense');
    const netSavingsEl = document.getElementById('reportNetSavings');
    const tableBody = document.getElementById('reportTransactionsBody');

    async function loadReports() {
        const month = monthFilter ? monthFilter.value : '';
        const category = categoryFilter ? categoryFilter.value : '';

        const data = await API.getReports({ month, category });

        if (totalIncomeEl) totalIncomeEl.innerText = formatINR(data.totalIncome);
        if (totalExpenseEl) totalExpenseEl.innerText = formatINR(data.totalExpense);
        // Render Point 9: Smart AI Financial Velocity in Reports
        renderSmartAIInsights({ totalExpense: data.totalExpense, budgetAmount: 40000 }, 'reportAIInsightsContainer');

        if (netSavingsEl) {
            netSavingsEl.innerText = formatINR(data.netSavings);
            netSavingsEl.className = data.netSavings >= 0 ? 'text-primary' : 'text-danger';
        }

        // Render Bar Chart (Monthly Trends)
        const barCanvas = document.getElementById('barChart');
        if (barCanvas) {
            const labels = data.monthlyTrends.map(t => t.month_label);
            const incData = data.monthlyTrends.map(t => t.total_income);
            const expData = data.monthlyTrends.map(t => t.total_expense);

            if (barChartInstance) barChartInstance.destroy();

            barChartInstance = new Chart(barCanvas, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        { label: 'Income', data: incData.length ? incData : [40000, 45000, 50000, 47000, 52000, 50000], backgroundColor: '#10b981', borderRadius: 6 },
                        { label: 'Expense', data: expData.length ? expData : [25000, 28000, 30000, 27000, 32000, 29000], backgroundColor: '#ef4444', borderRadius: 6 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Render Pie / Doughnut Chart (Categories)
        const pieCanvas = document.getElementById('pieChart');
        if (pieCanvas) {
            const pieLabels = data.categoryExpenseBreakdown.map(c => c.category);
            const pieData = data.categoryExpenseBreakdown.map(c => c.total);

            if (pieChartInstance) pieChartInstance.destroy();

            pieChartInstance = new Chart(pieCanvas, {
                type: 'doughnut',
                data: {
                    labels: pieLabels.length ? pieLabels : ['Food', 'Travel', 'Shopping', 'Bills', 'Others'],
                    datasets: [{
                        data: pieData.length ? pieData : [4250, 1200, 2500, 2300, 1000],
                        backgroundColor: ['#f59e0b', '#0284c7', '#ec4899', '#ef4444', '#8b5cf6', '#10b981']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // Transactions table
        if (tableBody) {
            if (data.transactions.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No matching transactions.</td></tr>`;
            } else {
                tableBody.innerHTML = data.transactions.map(t => `
                    <tr>
                        <td><strong>${escapeHtml(t.date)}</strong></td>
                        <td><span class="badge ${t.type === 'Income' ? 'bg-success' : 'bg-danger'}">${escapeHtml(t.type)}</span></td>
                        <td>${escapeHtml(t.title)}</td>
                        <td>${getCategoryBadge(escapeHtml(t.category), escapeHtml(t.type))}</td>
                        <td class="${t.type === 'Income' ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                            ${t.type === 'Income' ? '+' : '-'} ${formatINR(t.amount)}
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    if (filterBtn) filterBtn.addEventListener('click', loadReports);
    if (exportBtn) exportBtn.addEventListener('click', () => API.downloadCSV());

    loadReports();
}

// =========================================================
// AUTH PAGES (LOGIN, REGISTER, LOGOUT)
// =========================================================
function initLoginPage() {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginIcon = document.getElementById('loginIcon');
    const loginText = document.getElementById('loginText');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (loginBtn) {
            loginBtn.disabled = true;
            if (loginIcon) loginIcon.className = 'spinner-border spinner-border-sm me-2';
            if (loginText) loginText.textContent = 'Signing in...';
        }

        try {
            await API.login(email, password);
            showToast('Login Successful! Redirecting to Dashboard...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } catch (err) {
            showToast(err.message || 'Invalid Email or Password', 'error');
            if (loginBtn) {
                loginBtn.disabled = false;
                if (loginIcon) loginIcon.className = 'bi bi-box-arrow-in-right me-1';
                if (loginText) loginText.textContent = 'Sign In';
            }
        }
    });
}

function initRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password.length < 6) {
            showToast('PIN / Password must be at least 6 characters!', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }

        try {
            await API.register(name, email, mobile, password);
            showToast('Registration Successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);
        } catch (err) {
            showToast(err.message || 'Registration failed.', 'error');
        }
    });
}

function initLogoutPage() {
    API.logout();
    let seconds = 3;
    const countdownEl = document.getElementById('countdown');
    const timer = setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.innerText = seconds;
        if (seconds <= 0) {
            clearInterval(timer);
            window.location.href = 'login.html';
        }
    }, 1000);
}
