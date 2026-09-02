-- =====================================================================
-- CHURCH FINANCIAL MANAGEMENT & MONITORING SYSTEM (CFMMS)
-- MASTER DATABASE BLUEPRINT (schema.sql)
-- Multi-Tenant Template for Church Database Provisioning
-- =====================================================================

-- 1. CHURCH SETTINGS & ORGANIZATION BRANDING
CREATE TABLE IF NOT EXISTS church_settings (
    id SERIAL PRIMARY KEY,
    church_name VARCHAR(255) NOT NULL DEFAULT 'Church Financial System',
    church_acronym VARCHAR(50) NOT NULL DEFAULT 'CHURCH',
    member_id_prefix VARCHAR(20) NOT NULL DEFAULT 'MEM',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₱',
    address TEXT DEFAULT '',
    contact_number VARCHAR(50) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    vision_statement TEXT DEFAULT '',
    logo_url VARCHAR(500) DEFAULT '/images/logo.png',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SYSTEM USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Admin', 'Pastor', 'Treasurer', 'Secretary', 'Member'
    full_name VARCHAR(255),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 3. MEMBERS DIRECTORY
CREATE TABLE IF NOT EXISTS members (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id TEXT UNIQUE,
    official_name TEXT NOT NULL,
    login_id VARCHAR(100),
    phone TEXT,
    email VARCHAR(150),
    address TEXT,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    dob DATE,
    baptist_date DATE,
    join_date DATE,
    occupation VARCHAR(150),
    education VARCHAR(150),
    hobbies TEXT,
    gov_id VARCHAR(100),
    middle_name VARCHAR(100),
    name_1 VARCHAR(100),
    name_2 VARCHAR(100),
    tel_2 VARCHAR(50),
    role TEXT DEFAULT 'Member',
    status TEXT DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(official_name);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- 4. MEMBER ID SEQUENCE COUNTER
CREATE TABLE IF NOT EXISTS member_counters (
    id SERIAL PRIMARY KEY,
    year INTEGER UNIQUE,
    month INTEGER,
    counter INTEGER NOT NULL DEFAULT 0
);

-- 5. COLLECTION TYPES & FUNDS
CREATE TABLE IF NOT EXISTS collection_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    ps_calculation_type VARCHAR(50) DEFAULT 'none', -- 'none', 'percentage', 'fixed'
    ps_rate NUMERIC DEFAULT 0,
    apportionment_calculation_type VARCHAR(50) DEFAULT 'none',
    apportionment_rate NUMERIC DEFAULT 0,
    display_order INTEGER DEFAULT 0
);

-- 6. COLLECTION CALCULATIONS & ACCOUNTING CONFIG
CREATE TABLE IF NOT EXISTS collection_calculations (
    id SERIAL PRIMARY KEY,
    collection_type_id INTEGER UNIQUE REFERENCES collection_types(id) ON DELETE CASCADE,
    collection_type_name VARCHAR(150) NOT NULL,
    ps_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
    ps_rate NUMERIC NOT NULL DEFAULT 0,
    apportionment_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
    apportionment_rate NUMERIC NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. COLLECTIONS (RECEIPTS & CONTRIBUTIONS)
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50),
    date DATE NOT NULL,
    collection_date DATE,
    member_name VARCHAR(255) NOT NULL,
    member_id VARCHAR(100),
    type VARCHAR(150) NOT NULL,
    fund_category VARCHAR(150) NOT NULL,
    target TEXT,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    reference_no VARCHAR(100),
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'verified',
    collection_type_id INTEGER REFERENCES collection_types(id) ON DELETE SET NULL,
    ps_calculation_type VARCHAR(50),
    ps_type VARCHAR(50) DEFAULT 'NONE',
    ps_rate NUMERIC DEFAULT 0,
    ps_rate_used NUMERIC DEFAULT 0,
    ps_amount NUMERIC DEFAULT 0,
    apportionment_calculation_type VARCHAR(50),
    apportionment_type VARCHAR(50) DEFAULT 'NONE',
    apportionment_rate NUMERIC DEFAULT 0,
    apportionment_rate_used NUMERIC DEFAULT 0,
    apportionment_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(date);
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_receipt_no ON collections(receipt_no);
CREATE INDEX IF NOT EXISTS idx_collections_member_id ON collections(member_id);

-- 8. EXPENSES & VOUCHER DISBURSEMENTS
CREATE TABLE IF NOT EXISTS expenses (
    voucher_number VARCHAR(50) PRIMARY KEY,
    expense_id BIGINT GENERATED BY DEFAULT AS IDENTITY,
    date DATE NOT NULL,
    category VARCHAR(150),
    fund VARCHAR(150),
    amount NUMERIC NOT NULL,
    payee VARCHAR(255),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    description TEXT,
    notes TEXT,
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Void'
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_fund ON expenses(fund);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 9. AUDIT TRAIL & SYSTEM ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100),
    action_type VARCHAR(100),
    table_name VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
