import {
  Transaction,
  UserProfile,
  DeviceInfo,
  BeneficiaryInfo,
  FraudAlert,
  AuditLog,
  AgentInvestigationRecord,
  CustomRule,
  WatchlistItem,
  ApiKey,
  WebhookSubscription,
  CaseNote
} from './types.ts';

// In-Memory Database Collections
export const db = {
  users: new Map<string, UserProfile>(),
  transactions: new Map<string, Transaction>(),
  devices: new Map<string, DeviceInfo>(),
  beneficiaries: new Map<string, BeneficiaryInfo>(),
  fraud_alerts: new Map<string, FraudAlert>(),
  investigations: new Map<string, AgentInvestigationRecord>(),
  audit_logs: [] as AuditLog[],
  custom_rules: new Map<string, CustomRule>(),
  watchlists: new Map<string, WatchlistItem>(),
  api_keys: new Map<string, ApiKey>(),
  webhooks: new Map<string, WebhookSubscription>(),
  case_notes: new Map<string, CaseNote[]>(),
};

// Seed dataset archive items into memory DB
export function seedDatabase() {
  db.users.clear();
  db.transactions.clear();
  db.devices.clear();
  db.beneficiaries.clear();
  db.fraud_alerts.clear();
  db.investigations.clear();
  db.audit_logs = [];
  db.custom_rules.clear();
  db.watchlists.clear();
  db.api_keys.clear();
  db.webhooks.clear();
  db.case_notes.clear();

  // Users Dataset Archive
  db.users.set('U102', {
    user_id: 'U102',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+918639975744',
    account_created_at: '2025-01-01',
    kyc_status: 'VERIFIED',
    average_transaction_amount: 1850,
    median_transaction_amount: 1500,
    std_dev_amount: 420,
    maximum_normal_amount: 5000,
    usual_transaction_times: ['08:00-22:00'],
    usual_locations: ['Bengaluru'],
    usual_devices: ['DEV102_IPHONE14'],
    usual_merchants: ['Swiggy', 'Zomato'],
    usual_beneficiaries: ['B102_MOM'],
    average_daily_transaction_count: 2,
    average_daily_transaction_volume: 3700,
    recent_password_reset: false,
    recent_phone_change: false,
    failed_login_count_24h: 0,
    account_status: 'ACTIVE'
  });

  db.users.set('U205', {
    user_id: 'U205',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+919845012345',
    account_created_at: '2024-06-15',
    kyc_status: 'VERIFIED',
    average_transaction_amount: 2500,
    median_transaction_amount: 2000,
    std_dev_amount: 800,
    maximum_normal_amount: 8000,
    usual_transaction_times: ['09:00-21:00'],
    usual_locations: ['Mumbai'],
    usual_devices: ['DEV205_PIXEL8'],
    usual_merchants: ['Amazon', 'Flipkart'],
    usual_beneficiaries: ['B201_LANDLORD'],
    average_daily_transaction_count: 3,
    average_daily_transaction_volume: 7500,
    recent_password_reset: false,
    recent_phone_change: false,
    failed_login_count_24h: 0,
    account_status: 'ACTIVE'
  });

  db.users.set('U309', {
    user_id: 'U309',
    name: 'Vikram Malhotra',
    email: 'vikram.m@example.com',
    phone: '+919811223344',
    account_created_at: '2023-11-20',
    kyc_status: 'VERIFIED',
    average_transaction_amount: 12000,
    median_transaction_amount: 10000,
    std_dev_amount: 3500,
    maximum_normal_amount: 35000,
    usual_transaction_times: ['08:00-23:00'],
    usual_locations: ['Delhi'],
    usual_devices: ['DEV309_MACBOOK'],
    usual_merchants: ['MakeMyTrip', 'Apple Store'],
    usual_beneficiaries: [],
    average_daily_transaction_count: 1,
    average_daily_transaction_volume: 12000,
    recent_password_reset: false,
    recent_phone_change: false,
    failed_login_count_24h: 0,
    account_status: 'ACTIVE'
  });

  db.users.set('U412', {
    user_id: 'U412',
    name: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    phone: '+919988776655',
    account_created_at: '2026-08-15',
    kyc_status: 'VERIFIED',
    average_transaction_amount: 3400,
    median_transaction_amount: 2500,
    std_dev_amount: 1200,
    maximum_normal_amount: 10000,
    usual_transaction_times: ['10:00-20:00'],
    usual_locations: ['Hyderabad'],
    usual_devices: ['DEV778'],
    usual_merchants: ['Myntra'],
    usual_beneficiaries: ['B992'],
    average_daily_transaction_count: 5,
    average_daily_transaction_volume: 17000,
    recent_password_reset: true,
    recent_phone_change: false,
    failed_login_count_24h: 6,
    account_status: 'FLAGGED'
  });

  // Devices Dataset Archive
  db.devices.set('DEV102_IPHONE14', {
    device_id: 'DEV102_IPHONE14',
    device_model: 'Apple iPhone 14 Pro',
    os: 'iOS 17.4',
    browser: 'Mobile Safari',
    ip_address: '49.207.210.45',
    is_vpn: false,
    is_rooted_or_jailbroken: false,
    is_emulator: false,
    reputation_score: 98,
    first_seen: '2025-01-01',
    last_seen: '2026-08-22',
    associated_users_count: 1,
    associated_users: ['U102']
  });

  db.devices.set('DEV205_PIXEL8', {
    device_id: 'DEV205_PIXEL8',
    device_model: 'Google Pixel 8 Pro',
    os: 'Android 14',
    browser: 'Chrome 122',
    ip_address: '103.22.14.88',
    is_vpn: false,
    is_rooted_or_jailbroken: false,
    is_emulator: false,
    reputation_score: 95,
    first_seen: '2024-06-15',
    last_seen: '2026-08-22',
    associated_users_count: 1,
    associated_users: ['U205']
  });

  db.devices.set('DEV309_MACBOOK', {
    device_id: 'DEV309_MACBOOK',
    device_model: 'Apple MacBook Pro M3',
    os: 'macOS Sonoma',
    browser: 'Chrome 122',
    ip_address: '122.171.18.99',
    is_vpn: false,
    is_rooted_or_jailbroken: false,
    is_emulator: false,
    reputation_score: 99,
    first_seen: '2023-11-20',
    last_seen: '2026-08-22',
    associated_users_count: 1,
    associated_users: ['U309']
  });

  db.devices.set('DEV778', {
    device_id: 'DEV778',
    device_model: 'Generic Android Emulator',
    os: 'Android 12 (Rooted)',
    browser: 'Chrome 110',
    ip_address: '103.145.74.19',
    is_vpn: true,
    is_rooted_or_jailbroken: true,
    is_emulator: true,
    reputation_score: 15,
    first_seen: '2026-08-01',
    last_seen: '2026-08-22',
    associated_users_count: 2,
    associated_users: ['U102', 'U412']
  });

  db.devices.set('DEV_UNREGISTERED_NEW', {
    device_id: 'DEV_UNREGISTERED_NEW',
    device_model: 'Unrecognized Client Device',
    os: 'Unknown OS',
    browser: 'Unknown Browser',
    ip_address: '185.220.101.5',
    is_vpn: true,
    is_rooted_or_jailbroken: false,
    is_emulator: true,
    reputation_score: 25,
    first_seen: '2026-08-22',
    last_seen: '2026-08-22',
    associated_users_count: 1,
    associated_users: ['U102']
  });

  // Beneficiaries Dataset Archive
  db.beneficiaries.set('B102_MOM', {
    beneficiary_id: 'B102_MOM',
    name: 'Kavita Sharma (Mom)',
    account_or_vpa: 'kavita.sharma@okhdfcbank',
    bank_name: 'HDFC Bank',
    created_at: '2025-01-10',
    is_verified: true,
    risk_score: 5,
    associated_accounts_count: 1,
    associated_users: ['U102'],
    is_flagged_mule: false
  });

  db.beneficiaries.set('B201_LANDLORD', {
    beneficiary_id: 'B201_LANDLORD',
    name: 'Suresh Trivedi Estates',
    account_or_vpa: 'trivedi.estates@icici',
    bank_name: 'ICICI Bank',
    created_at: '2024-07-01',
    is_verified: true,
    risk_score: 8,
    associated_accounts_count: 1,
    associated_users: ['U205'],
    is_flagged_mule: false
  });

  db.beneficiaries.set('B_NEW_981', {
    beneficiary_id: 'B_NEW_981',
    name: 'Rajesh Electronics Store',
    account_or_vpa: 'rajesh.store@upi',
    bank_name: 'State Bank of India',
    created_at: '2026-08-20',
    is_verified: false,
    risk_score: 45,
    associated_accounts_count: 1,
    associated_users: ['U205'],
    is_flagged_mule: false
  });

  db.beneficiaries.set('B992', {
    beneficiary_id: 'B992',
    name: 'FastCash Mule Crypto Payee',
    account_or_vpa: 'fastcash.mule@upi',
    bank_name: 'Axis Bank',
    created_at: '2026-08-18',
    is_verified: false,
    risk_score: 95,
    associated_accounts_count: 2,
    associated_users: ['U102', 'U412'],
    is_flagged_mule: true
  });
}

// Initialize on startup
seedDatabase();
