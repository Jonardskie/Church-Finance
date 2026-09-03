# Church Financial Management & Monitoring System (CFMMS)
# Official User Manual & Feature Guide

A complete, step-by-step handbook for Church Pastors, Treasurers, Financial Officers, Secretaries, and Congregation Members.

---

## Table of Contents
1. [Introduction & Logging In](#1-introduction--logging-in)
2. [Role-Based Access & Permissions](#2-role-based-access--permissions)
3. [Financial Dashboard & KPIs](#3-financial-dashboard--kpis)
4. [Membership Directory & Stewardship](#4-membership-directory--stewardship)
5. [Collections & Offerings Ledger (Receipt Entry)](#5-collections--offerings-ledger-receipt-entry)
6. [Expenses & Disbursement Vouchers](#6-expenses--disbursement-vouchers)
7. [Financial Reports & Exports (Excel & PowerPoint)](#7-financial-reports--exports-excel--powerpoint)
8. [Member Stewardship Portal](#8-member-stewardship-portal)
9. [Audit Trail & Accountability](#9-audit-trail--accountability)
10. [System Settings & Church Profile](#10-system-settings--church-profile)

---

## 1. Introduction & Logging In

### System Overview
The Church Financial Management and Monitoring System (CFMMS) is a secure, cloud-enabled accounting and stewardship platform designed specifically for Christian churches. It automates financial record-keeping, multi-item receipt logging, fund breakdowns (such as Pastoral Support and Apportionment), expense disbursements with approvals, and one-click financial audit reporting.

### How to Log In
1. Open your church's portal web address (e.g. `https://grace.yourdomain.com` or `http://localhost:3000/login.html`).
2. Enter the following fields:
   * **Church Code**: The short identifier for your church (e.g., `maui` or `gbc`). If you navigated via your church's direct link, this will already be filled in for you.
   * **Member ID or Username**: Your assigned username (e.g., `admin`, `pastor`, or your Member ID like `MUMC-2026-0001`).
   * **Password**: Your confidential password.
3. Click **Sign In**.

> [!TIP]
> If you are on a public computer, always click **Log Out** at the bottom of the navigation sidebar when you are finished.

---

## 2. Role-Based Access & Permissions

To maintain strict internal controls and biblical financial accountability, system access is divided into 5 distinct roles:

| System Role | Primary Responsibilities | Permitted Modules |
|---|---|---|
| **Admin** | Senior Administrator, IT / Lead Pastor | Full system access: Users, Collections, Expenses, Settings, Reports, Audit Logs, and System Backups. |
| **Pastor** | Pastoral Oversight & Executive Leadership | Dashboard, Collections Review, Expense Approval / Voiding, Reports, and Audit Trail. |
| **Treasurer** | Chief Financial Officer | Collections Entry, Expense Entry, Disbursement Vouchers, Accounting Rules, and Financial Reports. |
| **Secretary** | Membership Registrar & Tithes Clerk | Membership Records, Church Directory, and Tithes/Offering Registration. |
| **Member** | Church Congregation Member | Personal Member Stewardship Portal: view own contribution history and download official giving statements. |

---

## 3. Financial Dashboard & KPIs

Upon signing in, leadership staff are greeted with the **Executive Financial Dashboard**.

### Key Performance Indicators (KPI Cards)
* **Total Collections**: The net sum of all verified collections and contributions for the current fiscal period.
* **Total Expenses**: Sum of all approved disbursements and operational expenditures.
* **Net Church Balance**: Total Collections minus Total Expenses. A healthy green indicator confirms surplus funds.
* **Active Congregation Members**: Total count of active members registered in your database.

### Real-Time Charts & Insights
* **6-Month Cash Flow Trend**: An interactive line chart comparing monthly revenues against disbursements to track seasonality (such as Thanksgiving and Christmas peaks).
* **Fund Category Breakdown**: A doughnut chart illustrating the distribution of incoming funds across Tithes, Pledges, General Offerings, Building Fund, etc.
* **Recent Activity Feed**: A live stream of recently recorded receipts, approved vouchers, and member registrations.

---

## 4. Membership Directory & Stewardship

Navigate to **Members** in the sidebar to manage your church family.

### Registering a New Member
1. Click the **+ Register Member** button.
2. Complete the member details:
   * **Personal Information**: Full Name, Middle Name, Gender, Marital Status, Date of Birth.
   * **Church Dates**: Baptism Date, Join Date.
   * **Contact Information**: Mobile Phone, Secondary Phone, Email, Physical Address.
   * **Government & Portal Info**: Government ID, Portal Login ID.
3. Click **Save Member**.

> [!NOTE]
> **Automatic Member ID Generation**: The system automatically formats and assigns the next sequence number (e.g. `GBC-2026-0001`).

### Member Controls & Functions
* **Search & Filters**: Instantly search by name, member ID, phone, or filter by active/inactive status.
* **CSV Import / Export**:
  * Click **Export CSV** to back up or manipulate records in spreadsheet programs.
  * Click **Import CSV** to batch-upload an entire church membership roster from an existing Excel or Google Sheets file.

---

## 5. Collections & Offerings Ledger (Receipt Entry)

Navigate to **Collections** in the sidebar. This module supports recording multiple contributions under a single official church receipt.

### Creating a Collection Receipt (Desktop-Style Multi-Item Form)
1. Click **+ Add Collection** to open the multi-item receipt modal.
2. **Receipt Header**:
   * **Date**: Defaults to today (editable for past Sundays).
   * **Verification Status**: Defaults to `Verified` so funds immediately reflect on financial reports.
   * **Member / Contributor**: Type any part of a member's name; an autocomplete dropdown will appear. You can also type `GUEST` for loose basket offerings or non-member visitors.
   * **Payment Method**: Select `Cash`, `Check`, `Bank Transfer`, `GCash`, or `Other`.
3. **Itemized Contributions Table**:
   * **Type**: Select collection fund (e.g., *Tithes, Lord's Acre, Thanksgiving, Pledges, Building Fund*).
   * **Fund / Target**: (e.g., *General Fund, Missions, Youth Ministry*).
   * **Remark**: Optional notes (e.g., *Check #1234* or *In memory of John Doe*).
   * **Amount**: Enter the numerical amount (e.g., `1000.00`).
4. **Fast Keyboard Navigation**:
   * Press **Enter** on any field to move forward to the next field.
   * When you are on the **Amount** field of the last row, press **Enter** to **automatically add a new item row**!
   * Use **Arrow Keys** ($\leftarrow$, $\rightarrow$, $\uparrow$, $\downarrow$) to effortlessly move between cells and rows.
5. **Live Receipt Total**: The total sum updates in real-time at the bottom of the modal.
6. Click **Save Receipt (Submit)**.

### Auto-Calculated Funds
Depending on your church's rules:
* **Pastoral Support (PS)**: Automatically deducted according to your configured rate (e.g., 10% on tithes).
* **Conference Apportionment**: Automatically calculated and recorded for district or national apportionment accounting.

---

## 6. Expenses & Disbursement Vouchers

Navigate to **Expenses** in the sidebar to maintain transparency on every dollar spent.

### 2-Step Approval Workflow
1. **Step 1: Voucher Creation (Treasurer / Secretary)**:
   * Click **+ New Expense Voucher**.
   * Enter Date, Payee, Expense Category (Utilities, Honorarium, Ministry, Building Maintenance), Fund Source, Amount, and Description.
   * Attach receipts or invoice photos if available.
   * The voucher is submitted with status **Pending**.
2. **Step 2: Executive Approval (Pastor / Admin)**:
   * Users with the Pastor or Admin role will see an **Approve** button on pending vouchers.
   * Once approved, the funds are officially deducted from the church's net cash balance.
   * Vouchers with discrepancies can be marked as **Void** with a documented reason.

---

## 7. Financial Reports & Exports (Excel & PowerPoint)

Navigate to **Reports** in the sidebar. CFMMS provides three integrated reports:

### 1. Receipt Summary Report
* Summarizes total giving per collection type across the selected date range.
* Displays contributor count, total gross amount, Pastoral Support allocations, and Apportionments.

### 2. Receipt Detail Report (Itemized Ledger)
* Provides complete audit-level detail of every receipt.
* **Organized & Grouped by Collection Type**: Transactions are neatly categorized under distinct section banners (e.g., all *Tithes* grouped together, followed by all *Lord's Acre*, followed by *Pledges*), complete with subtotal calculations per category and grand totals at the bottom.

### 3. Collection Method Breakdown
* Analyzes giving channels: percentage of cash, bank deposits, and digital transfers.

### One-Click Exports:
* **Export Excel**: Generates a professional multi-tab spreadsheet formatted for church board and council presentations, including category headers, accounting double-underlines, and formulas.
* **Export PowerPoint (PPTX)**: Generates a ready-to-present 16:9 widescreen presentation slide deck with a slide dedicated to each contribution fund for Sunday business meetings.
* **Print Report**: Prints a clean, printer-friendly summary for physical church archives.

---

## 8. Member Stewardship Portal

Church members have access to their own self-service portal (`member_portal.html`).

### What Members Can Do:
1. **View Lifetime & Annual Giving**: Transparent dashboard showing their year-to-date giving history.
2. **Giving Breakdown Chart**: Visual chart of their contributions across tithes, pledges, and special building offerings.
3. **Download Official Stewardship Certificate**: Click **Print Statement** to generate an official church certificate of giving suitable for tax deduction or personal stewardship tracking.
4. **Church Digital Giving Channels**: View the church's official bank account details and QR codes for GCash / Maya donations.

---

## 9. Audit Trail & Accountability

Navigate to **Audit Trail** in the sidebar.

* **Tamper-Evident Logging**: Every sensitive action in the system is automatically recorded:
  * Who logged in.
  * Who added, edited, or approved an expense.
  * Who changed church settings or user passwords.
* The audit log records the exact date, timestamp, user account, IP, and details of the modification.
* Records in the audit log are permanent and cannot be deleted by standard users.

---

## 10. System Settings & Church Profile

Navigate to **Settings** in the sidebar.

### Church Organization Profile (Admin Only)
* **Church Full Name**: Changes the official name displayed across reports and certificates (e.g. *Grace Bible Church*).
* **Church Acronym**: Short code displayed on the sidebar header and footer (e.g. *GBC*).
* **Member ID Prefix**: Configures the prefix for all newly created members (e.g., `GBC` produces `GBC-2026-0001`).
* **Currency Symbol**: Choose `₱`, `$`, or your local currency.
* **Contact Information & Address**: Printed on official certificates and report headers.

### User Account Profile
* All users can view their current authenticated username and role.
* Users can securely change their password anytime by entering their current password and confirming their new password.

---

## Technical Support & Best Practices

1. **Daily / Weekly Backups**: Export your collection and expense reports to Excel periodically for offline archival.
2. **Password Hygiene**: Never share the `Admin` password among multiple people. Create unique accounts for the Pastor, Treasurer, and Secretary.
3. **Verification Before Reports**: Ensure incoming collections are verified promptly so they appear in executive dashboards and financial summaries.
