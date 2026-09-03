# Church Financial Management & Monitoring System (CFMMS)
# Official User Manual & Feature Guide

A complete, step-by-step handbook for Church Pastors, Treasurers, Financial Officers, Secretaries, and Congregation Members.

---

## Table of Contents
1. [Introduction & Logging In](#1-introduction--logging-in)
2. [Role-Based Access & Dynamic Permission Matrix](#2-role-based-access--dynamic-permission-matrix)
3. [Financial Dashboard & KPIs](#3-financial-dashboard--kpis)
4. [Membership Directory & Stewardship](#4-membership-directory--stewardship)
5. [Collections, Offerings Ledger & Sunday Cash Count Tally](#5-collections-offerings-ledger--sunday-cash-count-tally)
6. [Expenses & Disbursement Vouchers](#6-expenses--disbursement-vouchers)
7. [Financial Reports, Multi-Sheet Excel & PPTX Exports](#7-financial-reports-multi-sheet-excel--pptx-exports)
8. [Member Stewardship Portal](#8-member-stewardship-portal)
9. [Audit Trail & Accountability](#9-audit-trail--accountability)
10. [System Settings & Tabbed Administration](#10-system-settings--tabbed-administration)

---

## 1. Introduction & Logging In

### System Overview
The Church Financial Management and Monitoring System (CFMMS) is a secure, cloud-enabled accounting and stewardship platform designed specifically for Christian churches. It automates financial record-keeping, multi-item receipt logging, Sunday cash count tallying, fund breakdowns (such as Pastoral Support and Apportionment), expense disbursements with approvals, and one-click financial audit reporting.

### How to Log In
1. Open your church's portal web address (e.g. `https://maui-church-finance.vercel.app/pages/login.html`).
2. Enter the following fields:
   * **Church Code**: The short identifier for your church (e.g., `maui` or `gbc`). If you navigated via your church's direct link, this will already be filled in for you.
   * **Member ID or Username**: Your assigned username (e.g., `admin`, `pastor`, or your Member ID like `MUMC-2026-0001`).
   * **Password**: Your confidential password.
3. Click **Sign In**.

> [!TIP]
> If you are on a public computer, always click **Log Out** at the bottom of the navigation sidebar when finished.

---

## 2. Role-Based Access & Dynamic Permission Matrix

To maintain strict internal controls and financial accountability, system access is divided into 5 distinct roles. In addition to baseline policies, the **Admin** can dynamically configure exact button and action permissions in **Settings ($\rightarrow$ ⚙️ Role Permissions Matrix)**.

### System Role Overview

| System Role | Primary Responsibilities | Permitted Modules & Default Scope |
|---|---|---|
| **Admin** | Senior Administrator / Lead Pastor | Full master system access: Users, Collections, Expenses, Settings, Granular Matrix, Reports, Audit Logs, and System Backups. |
| **Pastor** | Pastoral Oversight & Executive Leadership | Dashboard, Collections Overview, Expense Approvals, Reports Analytics, and Audit Stream. Actions fully configurable by Admin. |
| **Treasurer** | Chief Financial Officer | Collections Entry, Expense Disbursements, Sunday Cash Tally, Fund Formulas, and Financial Statements. Actions fully configurable by Admin. |
| **Secretary** | Membership Registrar & Tithes Clerk | Membership Roster, Church Directory, Collection Entry (Pending status), and Sunday Cash Count Tally. Actions fully configurable by Admin. |
| **Member** | Church Congregation Member | Personal Member Stewardship Portal: view own contribution history and download official giving statements. |

### Dynamic Action Permission Controls (Admin Settings)
* The **Admin** can toggle specific action permissions on or off for **Pastor**, **Treasurer**, **Secretary**, and **Member** roles across all modules:
  * **Members Directory**: View Directory, Add Member (`+ Button`), Edit Member, Delete Member.
  * **Collections Ledger**: View Ledger, Record Collection (`+ Button`), Edit Record, Verify Collection (`Verify Button`), Sunday Cash Tally (`💵 Tally Button`), Delete Record.
  * **Expenses Vouchers**: View Expenses, Create Request (`+ Button`), Approve / Disburse, Delete / Void.
  * **Financial Reports**: View Analytics, Export Multi-Sheet Excel, Print Statements.
  * **System Audit Trail**: View Logs, Purge Logs.
* **Dual Enforcement**: Disabled permissions are automatically hidden from the user's screen AND blocked on the server with `HTTP 403 Forbidden`.

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
> **Automatic Member ID Generation**: The system automatically formats and assigns the next sequence number (e.g. `MUMC-2026-0001`).

### Key Membership Features
* **Standardized Name Capitalization**: Auto-formats into `FIRST M.I. LAST` (e.g. *JUAN D. DELA CRUZ*) for clean government & financial reporting.
* **Nicknames & Aliases Linking**: Map informal donor aliases (e.g. *"Kuya Johnny"* $\rightarrow$ *JONARD SANTOCILDES*) so collection autocomplete matches immediately.
* **Family Linkages**: Group households together (Head of Household, Spouse, Children).
* **Bulk Excel Roster Import (.xlsx)**: Batch-upload an entire church membership roster using the standardized template (`CFMMS_Member_Import_Template.xlsx`).

---

## 5. Collections, Offerings Ledger & Sunday Cash Count Tally

Navigate to **Collections** in the sidebar.

### Creating a Collection Receipt
1. Click **+ Record Collection** (or press `Ctrl + Enter`).
2. **Receipt Header**:
   * **Date**: Defaults to today (editable for past Sundays).
   * **Verification Status**: Defaults to `Pending` when recorded by a Secretary, or `Verified` when recorded by Admin/Treasurer.
   * **Member / Contributor**: Search by member name or select **`Guest`** for loose basket offerings or visitors.
   * **Payment Method**: Select `Cash`, `Check`, `Bank Transfer`, `GCash`, or `Other`.
3. **Itemized Contributions Table**:
   * **Type**: Select collection fund (e.g., *Tithes, Lord's Acre, Thanksgiving, Pledges, Building Fund*).
   * **Fund / Target**: (e.g., *General Fund, Missions, Youth Ministry*).
   * **Remark**: Optional notes (e.g., *Check #1234* or *In memory of John Doe*).
   * **Amount**: Enter the numerical amount (e.g., `1000.00`).
4. Click **Save Collection**.

### Secretary Permissions & Verified Collection Lock Workflow
* **Pending Status**: Secretaries can edit and update collection details while the record status is **`Pending`**.
* **Verified Status Lock**: Once an Admin marks a collection as **`Verified`**, the record is permanently locked against non-admin edits.

### Sunday Cash Count & Reconciliation Tally System
1. Click **"💵 Sunday Cash Tally"** on the Collections or Reports page.
2. Enter physical denomination counts (₱1,000, ₱500, ₱200, ₱100, ₱50, ₱20 banknotes, coins, loose coins, checks, and GCash/online transfers).
3. The engine automatically computes total physical currency and reconciles against the recorded envelope ledger total:
   * **TALLY_MATCH**: Physical cash count matches total envelope receipts.
   * **VARIANCE_DETECTED**: Discrepancy detected; requires entering a mandatory audit variance note.
4. Select 3 Official Signatories from strict role-filtered dropdowns:
   * **Counter / Steward**: Strictly users/members with role `Secretary`.
   * **Finance Secretary**: Strictly users/members with role `Secretary`.
   * **Treasurer / Admin**: Strictly users/members with role `Treasurer` or `Admin`.
5. Click **Save Cash Count & Reconciliation Statement**. The statement is automatically included as **Sheet 4** in all Excel report exports!

---

## 6. Expenses & Disbursement Vouchers

Navigate to **Expenses** in the sidebar.

### 2-Step Approval Workflow
1. **Step 1: Voucher Creation (Treasurer / Secretary)**:
   * Click **+ New Expense Voucher**.
   * Enter Date, Payee, Expense Category (Utilities, Honorarium, Ministry, Building Maintenance), Fund Source, Amount, and Description.
   * Attach receipts or invoice photos if available.
   * The voucher is submitted with status **Pending**.
2. **Step 2: Executive Approval (Pastor / Admin)**:
   * Users with the Pastor or Admin role will see an **Approve** button on pending vouchers.
   * Once approved, funds are officially deducted from the church's net cash balance.
   * Discrepancies can be marked as **Void** with a mandatory documented audit reason.

---

## 7. Financial Reports, Multi-Sheet Excel & PPTX Exports

Navigate to **Reports** in the sidebar. CFMMS provides four integrated financial reports:

### 1. Receipt Summary Report
* Summarizes total giving per collection type across the selected date range, including gross receipts, Pastoral Support (PS) allocations, and Apportionments.

### 2. Receipt Detail Report (Itemized Ledger)
* Complete audit-level detail of every receipt, organized and grouped under distinct collection banners with category subtotals.

### 3. Collection Method Breakdown
* Analyzes giving channels: percentage of cash, bank deposits, and digital transfers.

### 4. Sunday Cash Count & Reconciliation Tally Statement
* Complete currency denomination breakdown, variance audit notes, and 3-role official signatories (**Counter / Steward**, **Finance Secretary**, **Treasurer / Admin**).

### One-Click Exports:
* **Export Multi-Sheet Excel (.xlsx)**:
  * **Sheet 1**: Financial Summary & KPIs
  * **Sheet 2**: Itemized Receipts Ledger
  * **Sheet 3**: Payment Channel Distribution
  * **Sheet 4**: Sunday Cash Count & Reconciliation Statement
* **Export PowerPoint (PPTX)**: Generates a ready-to-present 16:9 widescreen presentation slide deck with a dedicated slide per fund category for Sunday business meetings.
* **Print Report**: Prints a clean, printer-friendly summary with official church headers.

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
  * Who changed church settings, role permissions matrix, or user passwords.
* The audit log records the exact date, timestamp, user account, IP, and details of the modification.
* Records in the audit log are permanent and can only be purged by an authorized **Admin**.

---

## 10. System Settings & Tabbed Administration

Navigate to **Settings** in the sidebar. The settings page is organized into **4 Horizontal Pill Tabs**:

### Tab 1: ⛪ Church Profile
* **Church Full Name**: Changes the official name displayed across reports and certificates (e.g. *Maui United Methodist Church*).
* **Church Acronym**: Short code displayed on the sidebar header and footer (e.g. *MAUI UMC*).
* **Member ID Prefix**: Configures the prefix for all newly created members (e.g., `MUMC` produces `MUMC-2026-0001`).
* **Currency Symbol**: Choose `₱`, `$`, or your local currency.
* **Contact Information & Address**: Printed on official certificates and report headers.

### Tab 2: ⚙️ Role Permissions Matrix (Admin Only)
* Interactive master control grid to toggle specific button/action permissions for **Pastor**, **Treasurer**, **Secretary**, and **Member** roles across all system pages.

### Tab 3: 👤 My Profile & Password
* View current session account details (Full Name, Username / Member ID, Assigned Role Badge).
* Secure password change form (Current Password + New Password confirmation).

### Tab 4: 📚 System Toolkit & Manuals
* **System Operations Manual (PDF)**: Printable high-resolution operation guide.
* **Member Import Template (.xlsx)**: Downloadable standardized Excel workbook for bulk member directory uploads.

---

## Technical Support & Best Practices

1. **Periodic Backups**: Export your collection and expense reports to Excel regularly for offline archival.
2. **Unique User Accounts**: Avoid sharing passwords. Assign distinct user accounts to the Pastor, Treasurer, and Secretary to maintain clean audit trace records.
3. **Verification Before Reporting**: Ensure incoming collections are verified promptly so they reflect on executive dashboards and financial summaries.
