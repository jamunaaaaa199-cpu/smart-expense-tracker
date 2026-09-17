# Smart Expense Tracker - Automated Git & Deployment Guide

This guide details how to link this repository to your GitHub account and configure automated continuous deployment (CI/CD) to free cloud hosting platforms like **Render**, **Vercel**, or **Railway**.

---

## 🐙 Step 1: Initialize & Push to Your GitHub Account

Run the following commands in PowerShell or terminal inside your project folder:

```bash
# 1. Initialize Git repository
git init

# 2. Stage all upgraded files
git add .

# 3. Create your initial commit
git commit -m "feat: upgrade Smart Expense Tracker v2.1 with 4-stage alerts, PWA, and Express/SQLite backend"

# 4. Set main branch
git branch -M main

# 5. Link to your GitHub repository (replace USERNAME and REPO_NAME with your GitHub details)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# 6. Push code to GitHub
git push -u origin main
```

---

## ⚡ Step 2: Automated Deployment Options

### Option A: Deploy Full-Stack on Render.com (Recommended for Node + SQLite API)
1. Go to [Render.com](https://render.com) and sign in with your GitHub account.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Create Web Service**.
6. Render will automatically build, deploy, and provide a live URL (e.g. `https://smart-expense-tracker.onrender.com`).
   * *Every future `git push origin main` will automatically redeploy the latest changes without manual intervention!*

---

### Option B: Deploy on Vercel
1. Install Vercel CLI or link via [Vercel Dashboard](https://vercel.com).
2. Connect your GitHub repository.
3. Vercel automatically detects the static web frontend and serverless routes.

---

## 📱 Step 3: Installing as a Mobile & Windows Desktop App (PWA)

* **On Windows PC (Edge or Chrome):**
  * Open the deployed URL or `http://localhost:3000`.
  * Click the **Install App** icon in the browser address bar (top right) or press `Menu -> Apps -> Install Smart Expense Tracker`.
  * It will launch in its own standalone window with taskbar pinning!

* **On Mobile (Android / iOS):**
  * Open the website on Chrome (Android) or Safari (iOS).
  * Tap **Add to Home Screen** / **Install Application**.
  * The app icon will appear on your phone home screen and open in full-screen mobile app mode with the bottom navigation bar.
