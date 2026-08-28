# Church Financial & Membership Management System (CFMMS)
## Role-Based Access Control (RBAC) Restrictions Document

This document outlines the security architecture and authorization constraints applied across the CFMMS application. Authorization is enforced dynamically at two levels: **Frontend Page Guards** (client-side sidebar and page redirect configurations) and **Backend API Route Handlers** (Express endpoints protected via JSON Web Token verification and role middlewares).

---

## 1. Frontend Page-Level Access Mapping
The following table outlines page visibility and client-side router access for each role in the dashboard (`Dashboard/pages/`):

| Page File | Feature / Section | Admin | Pastor | Treasurer | Secretary | Member |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `index.html` | Dashboard Overview | ✅ | ✅ | ✅ | ✅ | ❌ *(Redirect)* |
| `members.html` | Member Directory & Mgmt | ✅ | ✅ | ✅ | ✅ | ❌ *(Redirect)* |
| `collections.html` | Collections List & Details | ✅ | ✅ | ✅ | ✅ | ❌ *(Redirect)* |
| `funds.html` | Funds & Categories | ✅ | ❌ | ✅ | ❌ | ❌ *(Redirect)* |
| `expenses.html` | Disbursements (Expenses) | ✅ | ✅ | ✅ | ❌ | ❌ *(Redirect)* |
| `reports.html` | Financial Reports & Exports | ✅ | ✅ | ✅ | ❌ | ❌ *(Redirect)* |
| `audit.html` | Audit Trail Logs | ✅ | ✅ | ✅ | ❌ | ❌ *(Redirect)* |
| `settings.html` | System Settings | ✅ | ✅ | ✅ | ✅ | ❌ *(Redirect)* |
| `member_portal.html` | Member Portal | ❌ *(Dashboard Link)* | ❌ *(Dashboard Link)* | ❌ *(Dashboard Link)* | ❌ *(Dashboard Link)* | ✅ |

> [!NOTE]
> *   **Member Redirects**: If a user with the role `Member` attempts to access any of the admin/officer dashboard pages, the page guard (`sidebar.js`) immediately triggers a `window.location.replace("member_portal.html")`.
> *   **Dashboard Swapping**: Admin, Pastor, Treasurer, and Secretary users viewing the Member Portal see an explicit button to swap back to the main Admin Dashboard (`index.html`).

---

## 2. Backend API Endpoint Restrictions
API security is enforced using JSON Web Tokens (JWT) and a verification middleware (`roleMiddleware`). Below is the dynamic restriction scheme for backend endpoints:

### A. Member Management (`/api/members`)
*   **Create Member (`POST /`)**: `Admin`, `Pastor`, `Secretary`
*   **Bulk Import Members (`POST /import`)**: `Admin`, `Pastor`, `Secretary`
*   **Update Member details (`PUT /:id`)**: `Admin`, `Pastor`, `Treasurer`, `Secretary`
*   **Batch Delete Members (`DELETE /batch`)**: `Admin`, `Pastor`
*   **Single Delete Member (`DELETE /:id`)**: `Admin`, `Pastor`
*   **Read Members List (`GET /` & `GET /:id`)**: All authenticated system users

### B. Collections Management (`/api/collections`)
*   **List Collections (`GET /`)**: `Admin`, `Pastor`, `Treasurer`, `Secretary`
*   **Calculations Summary (`GET /calculations`)**: `Admin`, `Pastor`, `Treasurer`, `Secretary`
*   **Create Collection (`POST /`)**: `Admin`, `Pastor`, `Treasurer`
*   **View Single Collection (`GET /:id`)**: `Admin`, `Pastor`, `Treasurer`
*   **Update Collection (`PUT /:id`)**: `Admin`, `Pastor`, `Treasurer`, `Secretary`
*   **Verify/Approve Collection (`PUT /:id/verify`)**: `Admin`, `Treasurer`
*   **Delete Collection (`DELETE /:id`)**: `Admin`, `Treasurer`

### C. Funds & Collection Types (`/api/collection-types`)
*   **Create Category/Fund (`POST /`)**: `Admin`, `Treasurer`
*   **Update Category/Fund (`PUT /:id`)**: `Admin`, `Treasurer`
*   **Delete Category/Fund (`DELETE /:id`)**: `Admin`, `Treasurer`

### D. Disbursements & Expenses (`/api/expenses`)
*   **List Expenses (`GET /`)**: `Admin`, `Pastor`, `Treasurer`
*   **Summary Analysis (`GET /summary`)**: `Admin`, `Pastor`, `Treasurer`
*   **Add Expense (`POST /`)**: `Admin`, `Pastor`, `Treasurer`
*   **Update Expense (`PUT /:id`)**: `Admin`, `Pastor`, `Treasurer`
*   **Verify Expense (`PUT /:id/verify`)**: `Admin`, `Pastor`, `Treasurer`
*   **Delete Expense (`DELETE /:id`)**: `Admin`, `Pastor`, `Treasurer`

### E. Financial Reports (`/api/reports`)
*   **Collection Summary Report (`GET /collections/summary`)**: `Admin`, `Pastor`, `Treasurer`
*   **Detail Breakdown Report (`GET /collections/detail`)**: `Admin`, `Pastor`, `Treasurer`
*   **Method Split Report (`GET /collections/methods`)**: `Admin`, `Pastor`, `Treasurer`
*   **Excel Export Tool (`GET /collections/excel`)**: `Admin`, `Pastor`, `Treasurer`
*   **Dashboard Summaries (`GET /dashboard-summary`)**: All authenticated system users

### F. System Audit Trail (`/api/audit`)
*   **Fetch Audit Logs (`GET /`)**: `Admin`, `Pastor`, `Treasurer`

---

## 3. Role Summary & Capabilities

### 👑 Admin
*   Full write, read, update, and delete authority across all database records and features.
*   The only role with absolute configuration settings override and database backup access.

### ⛪ Pastor
*   Full administrative oversight capability.
*   Authorized to manage and batch-delete members.
*   Can view, write, and verify disbursements/collections, and generate financial reports.
*   Restricted from adding or deleting general collection types/funds (managed by Treasurer).

### 💼 Treasurer
*   Full control over financial data, accounts, disbursements, and collection entries.
*   Authorized to approve/verify receipts, manage categories, and handle Excel/PowerPoint exports.
*   Authorized to update member records (e.g., matching a tithe to an official profile).
*   Restricted from batch deleting members and editing general system configuration parameters.

### 📝 Secretary
*   Primarily focused on membership logs, communications, and initial receipt collection logging.
*   Authorized to create members, bulk import lists, and update member profiles.
*   Authorized to input collection logs and modify pending logs.
*   Restricted from verifying/approving collections, handling disbursements, viewing financial reports, managing funds, deleting members, or checking system audit logs.

### 👤 Member
*   Strictly limited to the self-service **Member Portal**.
*   Authorized to log/report contributions, download personal printable Giving Statements, and view their own personal contribution ledger history.
*   Has no visibility into system-wide dashboards, church balances, other members' data, or general disbursements.
