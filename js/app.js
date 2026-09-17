// =========================================================
// Smart Expense Tracker - Master UI & Application Controller
// Version 2.1 - 4-Stage Budget Warning & Mobile/Desktop Engine
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
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

// Format Currency
function formatINR(val) {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
}

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
                        <span class="alert-stat-badge">Remaining Balance: ₹0</span>
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
                        Caution: You have crossed the <strong>75%</strong> milestone of your spending allowance. 
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
                        You have utilized <strong>50%</strong> of your monthly financial budget. 
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
            const val = document.getElementById('inputNewBudget').value;
            if (val && Number(val) > 0) {
                await API.updateBudget(Number(val));
                showToast('Budget target updated successfully!');
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
                initDashboard();
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

        if (txTableBody) {
            if (!stats.recentTransactions || stats.recentTransactions.length === 0) {
                txTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No recent transactions recorded.</td></tr>`;
            } else {
                txTableBody.innerHTML = stats.recentTransactions.map(tx => `
                    <tr>
                        <td><strong>${tx.date}</strong></td>
                        <td>${getCategoryBadge(tx.category, tx.type)}</td>
                        <td>${tx.title}</td>
                        <td class="${tx.type === 'Income' ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                            ${tx.type === 'Income' ? '+' : '-'} ${formatINR(tx.amount)}
                        </td>
                        <td>
                            <span class="badge ${tx.type === 'Income' ? 'bg-success' : 'bg-danger'}">
                                ${tx.type}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

// =========================================================
// INCOME PAGE
// =========================================================
async function initIncomePage() {
    const form = document.getElementById('incomeForm');
    const tableBody = document.getElementById('incomeTableBody');
    const searchInput = document.getElementById('searchIncome');
    const categorySelect = document.getElementById('filterCategory');

    async function loadIncomeList() {
        const search = searchInput ? searchInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : '';

        const items = await API.getIncome({ search, category });
        if (!tableBody) return;

        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No income records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.income_date}</strong></td>
                <td>${item.source}</td>
                <td>${getCategoryBadge(item.category, 'Income')}</td>
                <td class="text-success fw-bold">+ ${formatINR(item.amount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="handleDeleteIncome(${item.income_id || index})" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const source = document.getElementById('incomeSource').value.trim();
            const category = document.getElementById('incomeCategory').value;
            const amount = document.getElementById('incomeAmount').value;
            const income_date = document.getElementById('incomeDate').value;
            const description = document.getElementById('incomeDescription')?.value.trim() || '';

            if (!source || !category || category === 'Select Category' || !amount || !income_date) {
                showToast('Please fill all required fields correctly.', 'error');
                return;
            }

            try {
                await API.addIncome({ source, category, amount, income_date, description });
                showToast('Income added successfully!');
                form.reset();
                const dateInput = document.getElementById('incomeDate');
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                loadIncomeList();
            } catch (err) {
                showToast('Failed to add income.', 'error');
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => loadIncomeList());
    if (categorySelect) categorySelect.addEventListener('change', () => loadIncomeList());

    const dateInput = document.getElementById('incomeDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    window.handleDeleteIncome = async function(id) {
        if (confirm('Are you sure you want to delete this income entry?')) {
            await API.deleteIncome(id);
            showToast('Income deleted successfully.');
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

    async function loadExpenseList() {
        const search = searchInput ? searchInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : '';

        const items = await API.getExpenses({ search, category });
        
        // Update budget alert on expenses page as well
        const stats = await API.getDashboardStats();
        renderBudgetAlerts(stats.spentPercent, stats.totalExpense, stats.budgetAmount, 'budgetAlertContainer');

        if (!tableBody) return;

        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No expense records found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.expense_date}</strong></td>
                <td>${item.title}</td>
                <td>${getCategoryBadge(item.category, 'Expense')}</td>
                <td class="text-danger fw-bold">- ${formatINR(item.amount)}</td>
                <td class="text-muted small">${item.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="handleDeleteExpense(${item.expense_id || index})" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('expenseTitle').value.trim();
            const category = document.getElementById('expenseCategory').value;
            const amount = document.getElementById('expenseAmount').value;
            const expense_date = document.getElementById('expenseDate').value;
            const description = document.getElementById('expenseDescription')?.value.trim() || '';

            if (!title || !category || category === 'Select Category' || !amount || !expense_date) {
                showToast('Please fill all required fields correctly.', 'error');
                return;
            }

            try {
                await API.addExpense({ title, category, amount, expense_date, description });
                showToast('Expense recorded successfully!');
                form.reset();
                const dateInput = document.getElementById('expenseDate');
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                loadExpenseList();
            } catch (err) {
                showToast('Failed to record expense.', 'error');
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => loadExpenseList());
    if (categorySelect) categorySelect.addEventListener('change', () => loadExpenseList());

    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    window.handleDeleteExpense = async function(id) {
        if (confirm('Are you sure you want to delete this expense record?')) {
            await API.deleteExpense(id);
            showToast('Expense record deleted.');
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
                        <td><strong>${t.date}</strong></td>
                        <td><span class="badge ${t.type === 'Income' ? 'bg-success' : 'bg-danger'}">${t.type}</span></td>
                        <td>${t.title}</td>
                        <td>${getCategoryBadge(t.category, t.type)}</td>
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
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            await API.login(email, password);
            showToast('Login Successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } catch (err) {
            showToast(err.message || 'Invalid Email or Password', 'error');
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
