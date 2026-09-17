// ================================
// Smart Expense Tracker
// script.js
// ================================

// Load Data
let incomes = JSON.parse(localStorage.getItem("incomes")) || [];
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

// Save Data
function saveData() {
    localStorage.setItem("incomes", JSON.stringify(incomes));
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

// ------------------------------
// Add Income
// ------------------------------
function addIncome(source, category, amount, date, description) {

    incomes.push({
        source,
        category,
        amount: Number(amount),
        date,
        description
    });

    saveData();

    alert("Income Added Successfully!");
}

// ------------------------------
// Add Expense
// ------------------------------
function addExpense(title, category, amount, date, description) {

    expenses.push({
        title,
        category,
        amount: Number(amount),
        date,
        description
    });

    saveData();

    alert("Expense Added Successfully!");
}

// ------------------------------
// Calculate Totals
// ------------------------------
function getTotalIncome() {

    return incomes.reduce((sum, item) => sum + item.amount, 0);

}

function getTotalExpense() {

    return expenses.reduce((sum, item) => sum + item.amount, 0);

}

function getBalance() {

    return getTotalIncome() - getTotalExpense();

}

// ------------------------------
// Dashboard
// ------------------------------
function updateDashboard() {

    const income = document.getElementById("totalIncome");
    const expense = document.getElementById("totalExpense");
    const balance = document.getElementById("currentBalance");

    if (income)
        income.innerText = "₹" + getTotalIncome();

    if (expense)
        expense.innerText = "₹" + getTotalExpense();

    if (balance)
        balance.innerText = "₹" + getBalance();

}

// ------------------------------
// Expense Table
// ------------------------------
function loadExpenses() {

    const table = document.getElementById("expenseTable");

    if (!table) return;

    table.innerHTML = "";

    expenses.forEach((expense, index) => {

        table.innerHTML += `
        <tr>

            <td>${expense.date}</td>
            <td>${expense.title}</td>
            <td>${expense.category}</td>
            <td class="text-danger">
                ₹${expense.amount}
            </td>

            <td>

                <button
                class="btn btn-sm btn-danger"
                onclick="deleteExpense(${index})">

                Delete

                </button>

            </td>

        </tr>
        `;

    });

}

// ------------------------------
// Income Table
// ------------------------------
function loadIncome() {

    const table = document.getElementById("incomeTable");

    if (!table) return;

    table.innerHTML = "";

    incomes.forEach((income, index) => {

        table.innerHTML += `

        <tr>

            <td>${income.date}</td>
            <td>${income.source}</td>
            <td>${income.category}</td>
            <td class="text-success">
                ₹${income.amount}
            </td>

            <td>

                <button
                class="btn btn-sm btn-danger"
                onclick="deleteIncome(${index})">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

}

// ------------------------------
// Delete
// ------------------------------
function deleteExpense(index) {

    expenses.splice(index, 1);

    saveData();

    loadExpenses();

    updateDashboard();

}

function deleteIncome(index) {

    incomes.splice(index, 1);

    saveData();

    loadIncome();

    updateDashboard();

}

// ------------------------------
// Reports
// ------------------------------
function reportData() {

    return {

        income: getTotalIncome(),

        expense: getTotalExpense(),

        balance: getBalance(),

        incomes,

        expenses

    };

}

// ------------------------------
// Search Expense
// ------------------------------
function searchExpense(keyword) {

    keyword = keyword.toLowerCase();

    return expenses.filter(e =>

        e.title.toLowerCase().includes(keyword) ||

        e.category.toLowerCase().includes(keyword)

    );

}

// ------------------------------
// Search Income
// ------------------------------
function searchIncome(keyword) {

    keyword = keyword.toLowerCase();

    return incomes.filter(i =>

        i.source.toLowerCase().includes(keyword) ||

        i.category.toLowerCase().includes(keyword)

    );

}

// ------------------------------
// Initialize
// ------------------------------
document.addEventListener("DOMContentLoaded", function () {

    updateDashboard();

    loadExpenses();

    loadIncome();

});