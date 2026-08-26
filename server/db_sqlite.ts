import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'sentinel.db');

const sqlite = sqlite3.verbose();
const dbConnection = new sqlite.Database(DB_PATH);

// Helper to run queries as promises
export const dbQuery = {
  run: (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      dbConnection.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      dbConnection.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      dbConnection.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  exec: (sql: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      dbConnection.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

function getFileChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function initDatabase() {
  console.log(`Initializing versioned migrations at database: ${DB_PATH}...`);
  
  // 1. Create schema_migrations table if not exists
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT,
      checksum TEXT
    )
  `);

  // 2. Read migration files from schema_migrations/
  const migrationsDir = path.join(process.cwd(), 'schema_migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`CRITICAL: Migrations directory not found at ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sequential alphabetical sorting

  // 3. Process each migration
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = getFileChecksum(content);

    // Check if migration has already been applied
    const applied = await dbQuery.get('SELECT * FROM schema_migrations WHERE version = ?', [file]);

    if (applied) {
      // Validate checksum consistency
      if (applied.checksum !== checksum) {
        console.error(`CRITICAL ERROR: Checksum mismatch for database migration ${file}`);
        console.error(`  Expected: ${applied.checksum}`);
        console.error(`  Actual:   ${checksum}`);
        throw new Error(`Migration checksum validation failed for ${file}. Potential database schema manipulation.`);
      }
    } else {
      console.log(`Applying database migration: ${file}...`);
      try {
        await dbQuery.exec(content);
        await dbQuery.run(
          'INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (?, ?, ?)',
          [file, new Date().toISOString(), checksum]
        );
      } catch (err: any) {
        console.error(`CRITICAL ERROR: Failed to apply migration ${file}`, err);
        throw new Error(`Migration startup failure: ${err.message}`);
      }
    }
  }

  // 4. Seed baselines if empty
  const merchantCount = await dbQuery.get('SELECT COUNT(*) as count FROM merchant_baselines');
  if (merchantCount.count === 0) {
    console.log("Seeding merchant baseline records...");
    await dbQuery.run(`
      INSERT INTO merchant_baselines (merchant_id, transaction_rate_baseline, risk_rate_baseline, amount_baseline_avg, amount_baseline_std)
      VALUES 
      ('M_MULE_DESK', 1.2, 0.28, 55000.0, 15000.0),
      ('M_ZOMATO', 15.0, 0.004, 850.0, 300.0),
      ('M_TRANSFER', 2.5, 0.12, 12000.0, 4500.0)
    `);
  }

  const userCount = await dbQuery.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log("Seeding baseline database records...");
    
    // Seed Users
    await dbQuery.run(`
      INSERT INTO users (user_id, name, email, phone, account_created_at, kyc_status, average_transaction_amount, median_transaction_amount, std_dev_amount, maximum_normal_amount, account_status, failed_login_count_24h, recent_password_reset, recent_phone_change)
      VALUES 
      ('U102', 'Aarav Sharma', 'aarav.sharma@example.com', '+918639975744', '2025-01-01', 'VERIFIED', 1850, 1500, 420, 5000, 'ACTIVE', 0, 0, 0),
      ('U205', 'Priya Patel', 'priya.patel@example.com', '+919845012345', '2024-06-15', 'VERIFIED', 2500, 2000, 800, 8000, 'ACTIVE', 0, 0, 0),
      ('U309', 'Vikram Malhotra', 'vikram.m@example.com', '+919811223344', '2023-11-20', 'VERIFIED', 12000, 10000, 3500, 35000, 'ACTIVE', 0, 0, 0),
      ('U412', 'Ananya Rao', 'ananya.rao@example.com', '+919988776655', '2026-08-15', 'VERIFIED', 3400, 2500, 1200, 10000, 'FLAGGED', 6, 1, 0)
    `);

    // Seed Devices
    await dbQuery.run(`
      INSERT INTO devices (device_id, device_model, os, browser, ip_address, is_vpn, is_rooted_or_jailbroken, is_emulator, reputation_score, first_seen, last_seen, associated_users_count)
      VALUES
      ('DEV102_IPHONE14', 'Apple iPhone 14 Pro', 'iOS 17.4', 'Mobile Safari', '49.207.210.45', 0, 0, 0, 98, '2025-01-01', '2026-08-22', 1),
      ('DEV205_PIXEL8', 'Google Pixel 8 Pro', 'Android 14', 'Chrome 122', '103.22.14.88', 0, 0, 0, 95, '2024-06-15', '2026-08-22', 1),
      ('DEV309_MACBOOK', 'Apple MacBook Pro M3', 'macOS Sonoma', 'Chrome 122', '122.171.18.99', 0, 0, 0, 99, '2023-11-20', '2026-08-22', 1),
      ('DEV778', 'Generic Android Emulator', 'Android 12 (Rooted)', 'Chrome 110', '103.145.74.19', 1, 1, 1, 15, '2026-08-01', '2026-08-22', 2),
      ('DEV_UNREGISTERED_NEW', 'Unrecognized Client Device', 'Unknown OS', 'Unknown Browser', '185.220.101.5', 1, 0, 1, 25, '2026-08-22', '2026-08-22', 1)
    `);

    // Seed Beneficiaries
    await dbQuery.run(`
      INSERT INTO beneficiaries (beneficiary_id, name, account_or_vpa, bank_name, created_at, is_verified, risk_score, associated_accounts_count, is_flagged_mule)
      VALUES
      ('B102_MOM', 'Kavita Sharma (Mom)', 'kavita.sharma@okhdfcbank', 'HDFC Bank', '2025-01-10', 1, 5, 1, 0),
      ('B201_LANDLORD', 'Suresh Trivedi Estates', 'trivedi.estates@icici', 'ICICI Bank', '2024-07-01', 1, 8, 1, 0),
      ('B_NEW_981', 'Rajesh Electronics Store', 'rajesh.store@upi', 'State Bank of India', '2026-08-20', 0, 45, 1, 0),
      ('B992', 'FastCash Mule Crypto Payee', 'fastcash.mule@upi', 'Axis Bank', '2026-08-18', 0, 95, 2, 1)
    `);

    // Seed Custom Rules
    await dbQuery.run(`
      INSERT INTO custom_rules (id, name, description, rule_condition, risk_contribution, severity, is_active, created_at)
      VALUES
      ('RULE-01', 'Emulator with VPN', 'Detects transaction from an emulator using a VPN network.', 'device.is_emulator == true && device.is_vpn == true', 35, 'HIGH', 1, '2026-08-20'),
      ('RULE-02', 'High Amount Deviation', 'Amount is 5x larger than user average transaction baseline.', 'amount > 5 * user.average_transaction_amount', 30, 'MEDIUM', 1, '2026-08-20'),
      ('RULE-03', 'Mule Account Beneficiary', 'Beneficiary is flagged as a mule bank account.', 'beneficiary.is_flagged_mule == true', 55, 'CRITICAL', 1, '2026-08-20')
    `);

    console.log("Database seeded successfully.");
  }
}
