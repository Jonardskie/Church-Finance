# Administrator Guide: Setting Up a New Client Church
**Church Financial Management & Monitoring System (CFMMS)**  
*Multi-Tenant SaaS Provisioning Guide*

---

## Overview

When you sell this system to a new church, they receive their own **independent, completely isolated database**. Their financial transactions, member records, and audit logs are physically separated from all other churches.

This guide walks you through the 3 simple steps to provision and onboard a new church in under 2 minutes.

---

## Step 1: Create a Database for the New Church

You can create a new database on **Neon Serverless Postgres** (recommended for automatic autoscaling and zero-cost idle scaling):

1. Log in to your [Neon Console](https://console.neon.tech).
2. Click **"New Project"** (or create a new database inside an existing project).
   * **Project Name**: e.g., `grace-bible-church`
   * **Region**: Choose closest to the church (e.g., `ap-southeast-1` Singapore for Asia/Philippines, or `us-east-2` for US).
   * **Postgres Version**: 16 (or latest).
3. Once created, copy the **Connection String**:
   ```
   postgres://neondb_owner:npg_AbCdEf123456@ep-cool-frost-a1b2c3d4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Run the Automated Onboarding Command

Open your terminal in the project root directory (`d:\Church-Finance`) and run the onboarding command with the church's details:

```bash
npm run onboard:church -- \
  --databaseUrl="YOUR_NEW_NEON_CONNECTION_STRING" \
  --name="Grace Bible Church" \
  --acronym="GBC" \
  --slug="grace" \
  --prefix="GBC" \
  --currency="₱" \
  --adminUser="admin" \
  --adminPassword="TempPassword2026!" \
  --adminEmail="pastor@gracebible.org"
```

### Explanation of Command Parameters:

| Parameter | Required | Description | Example |
|---|---|---|---|
| `--databaseUrl` | **Yes** | The new Neon database connection string | `postgres://...` |
| `--name` | **Yes** | Full official name of the church | `"Grace Bible Church"` |
| `--slug` | **Yes** | Unique identifier for subdomains & logins (lowercase) | `"grace"` |
| `--acronym` | **Yes** | Short name displayed on sidebar & banners | `"GBC"` |
| `--prefix` | **Yes** | Prefix for member IDs (`PREFIX-YYYY-0001`) | `"GBC"` |
| `--currency` | Optional | Currency symbol (default: `₱`) | `"₱"` or `"$"` |
| `--adminUser` | Optional | Primary Admin username (default: `admin`) | `"pastor"` or `"admin"` |
| `--adminPassword`| Optional | Initial temporary password | `"ChangeMe123!"` |
| `--adminEmail` | Optional | Pastor or treasurer's email | `"finance@church.org"` |

### What the Onboarding Script Does Automatically:
1. **Applies Database Blueprint**: Creates all 9 tables (`church_settings`, `users`, `members`, `member_counters`, `collection_types`, `collection_calculations`, `collections`, `expenses`, `audit_logs`) and speed indexes.
2. **Seeds Default Funds**: Pre-populates 20 standard collection categories (Tithes, Offerings, Pledges, Building Fund, Lord's Acre, etc.) and accounting split formulas.
3. **Applies Custom Branding**: Configures church name, acronym, currency, and member prefix.
4. **Provisions Super-Admin**: Encrypts the password with bcrypt and creates the initial Admin account.
5. **Registers in Master Directory**: Adds the church to your server's central `tenants` table so your server immediately recognizes traffic for this church.

---

## Step 3: Deliver Access to the Church

Once onboarding completes, provide the client with:

1. **Website Link**:
   * If using subdomains: `https://grace.yourdomain.com`
   * If using custom URL code: `https://yourdomain.com/login.html?church=grace`
   * Or direct them to enter **Church Code**: `grace` on the login page.
2. **Initial Login Credentials**:
   * **Username**: `admin`
   * **Password**: `TempPassword2026!`
3. **Security Reminder**:
   * Advise the Pastor or Treasurer to navigate to **Settings** $\rightarrow$ **User Profile** immediately upon first login to update their password.

---

## Managing Client Churches (Master Directory)

You can manage all client church subscriptions from the Master Database `tenants` table.

### View All Active Churches:
```sql
SELECT id, slug, name, status, plan, created_at FROM tenants ORDER BY id;
```

### Temporarily Suspend a Church (e.g., Unpaid Subscription):
```sql
UPDATE tenants SET status = 'suspended' WHERE slug = 'grace';
```
*Effect*: The next time anyone from Grace Bible Church attempts to access the portal, the server immediately denies access with:
> `403 Forbidden: The subscription for 'Grace Bible Church' is currently suspended.`

### Reactivate a Suspended Church:
```sql
UPDATE tenants SET status = 'active' WHERE slug = 'grace';
```

---

## Optional: Custom Domain & Subdomain Setup

To allow churches to use their own web addresses (e.g. `grace.yourdomain.com`):

1. **Wildcard DNS**:
   In your domain registrar (e.g., Cloudflare, Namecheap, GoDaddy):
   * Add a `CNAME` record:
     * **Host**: `*`
     * **Target**: `your-server.onrender.com` (or your host IP)
2. **Result**:
   Any church visiting `anything.yourdomain.com` will automatically be routed to their matching church database!
