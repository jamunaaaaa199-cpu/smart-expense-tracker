# 💰 Smart Expense Tracker v2.1

A full-stack, cross-platform personal finance management system engineered with **Node.js, Express, SQLite3, Bootstrap 5, Chart.js**, and an intelligent **4-Stage Budget Warning System (50%, 75%, 90%, 100%)**.

### 🌐 Live Production Deployments
* **Primary Live App (GitHub Pages - Clean SSL):** [https://jamunaaaaa199-cpu.github.io/smart-expense-tracker/](https://jamunaaaaa199-cpu.github.io/smart-expense-tracker/)
* **Vercel Mirror:** [https://smart-expense-tracker-omega-teal.vercel.app/](https://smart-expense-tracker-omega-teal.vercel.app/)
* **Technical Architecture PDF:** [Download / View PDF](https://jamunaaaaa199-cpu.github.io/smart-expense-tracker/Smart_Expense_Tracker_Technical_Architecture.pdf)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jamunaaaaa199-cpu/smart-expense-tracker)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jamunaaaaa199-cpu/smart-expense-tracker)

---

## 🌟 Key Features

* **🛡️ 4-Stage Threshold Warnings**: Real-time spending threshold calculation with in-app alert cards:
  * **Stage 1 (50%)**: Halfway spending milestone notice & safe remaining balance.
  * **Stage 2 (75%)**: Moderate caution warning to slow non-essential spending.
  * **Stage 3 (90%)**: Critical warning pulse alert with remaining safe funds.
  * **Stage 4 (100%+)**: Budget limit exhausted / overspent deficit alert.
* **📱 Progressive Web App (PWA)**:
  * **Windows Desktop App**: Click "Install App" in Chrome/Edge to run as a standalone desktop software.
  * **Mobile App Mode**: Native-like bottom navigation dock on iOS and Android.
* **📊 Visual Financial Analytics**: Multi-dataset Chart.js graphs for monthly cash flows and category distribution.
* **⚡ Dual-Mode Engine**: Communicates with the Express REST API and seamlessly falls back to offline `localStorage`.
* **📁 Instant CSV Export**: One-click transaction export for offline accounting.

---

## 🚀 Quick Start (Local Run)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in your browser
http://localhost:3000
```

### Default Demo Credentials:
* **Email:** `demo@example.com`
* **Password:** `admin123`

---

## 🌐 1-Click Automated Cloud Deployment

Click the **Deploy to Render** button above to automatically launch your free cloud instance with automated CI/CD continuous deployment on every `git push`.
