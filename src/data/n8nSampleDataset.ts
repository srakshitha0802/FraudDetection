export interface N8nSampleTestCase {
  id: string;
  name: string;
  category: 'LEGITIMATE' | 'STEP_UP_REVIEW' | 'HIGH_FRAUD_ALERT' | 'EDGE_CASE_VALIDATION';
  description: string;
  expectedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK' | 'ALERT' | 'DUPLICATE' | 'REJECTED';
  expectedRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'ERROR';
  payload: {
    transaction_id: string;
    user_id: string;
    amount: number;
    currency: string;
    merchant: string;
    timestamp: string;
    location: {
      city: string;
      country: string;
      unusual_location: boolean;
      is_usual: boolean;
    };
    device: {
      device_id: string;
      new_device: boolean;
      is_known: boolean;
    };
    payment_method: string;
    previous_average_amount: number;
    previous_transaction_count: number;
    account_age_days: number;
    high_frequency: boolean;
  };
  threatNotes: string;
}

export const N8N_SAMPLE_DATASET: N8nSampleTestCase[] = [
  {
    id: 'SAMPLE-01-LEGIT-GROCERY',
    name: '1. Legitimate Everyday UPI Payment',
    category: 'LEGITIMATE',
    description: 'Routine morning grocery payment from registered iPhone at normal local merchant.',
    expectedDecision: 'APPROVE',
    expectedRiskTier: 'LOW',
    payload: {
      transaction_id: 'TX_LEGIT_001',
      user_id: 'U_RAKSHITHA_101',
      amount: 850,
      currency: 'INR',
      merchant: 'Swiggy Instamart / Local Grocery',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Bengaluru',
        country: 'IN',
        unusual_location: false,
        is_usual: true
      },
      device: {
        device_id: 'DEV_IPHONE_14_VERIFIED',
        new_device: false,
        is_known: true
      },
      payment_method: 'UPI',
      previous_average_amount: 1200,
      previous_transaction_count: 84,
      account_age_days: 365,
      high_frequency: false
    },
    threatNotes: 'Spend is below historical average (0.7x), known device, standard location, 1-year verified account.'
  },
  {
    id: 'SAMPLE-02-LEGIT-APPLIANCE',
    name: '2. High-Value Verified Appliance Purchase',
    category: 'LEGITIMATE',
    description: 'Home appliance purchase on 3DS verified Credit Card with 2-year tenure.',
    expectedDecision: 'APPROVE',
    expectedRiskTier: 'LOW',
    payload: {
      transaction_id: 'TX_LEGIT_002',
      user_id: 'U_RAKSHITHA_101',
      amount: 24500,
      currency: 'INR',
      merchant: 'Croma Electronics Megastore',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Bengaluru',
        country: 'IN',
        unusual_location: false,
        is_usual: true
      },
      device: {
        device_id: 'DEV_MACBOOK_PRO_VERIFIED',
        new_device: false,
        is_known: true
      },
      payment_method: 'CREDIT_CARD',
      previous_average_amount: 15000,
      previous_transaction_count: 120,
      account_age_days: 720,
      high_frequency: false
    },
    threatNotes: 'Amount multiplier 1.6x average within normal spend distribution, verified hardware, zero threat signals.'
  },
  {
    id: 'SAMPLE-03-STEPUP-NEW-DEVICE',
    name: '3. Step-Up 2FA (New Device & Spend Jump)',
    category: 'STEP_UP_REVIEW',
    description: 'First transaction on an unverified tablet at late night with 5.5x spend jump.',
    expectedDecision: 'REVIEW',
    expectedRiskTier: 'MEDIUM',
    payload: {
      transaction_id: 'TX_REVIEW_003',
      user_id: 'U_RAKSHITHA_101',
      amount: 14500,
      currency: 'INR',
      merchant: 'Luxury Apparel Online Outlet',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Mumbai',
        country: 'IN',
        unusual_location: false,
        is_usual: true
      },
      device: {
        device_id: 'DEV_TABLET_NEW_LOGIN_77',
        new_device: true,
        is_known: false
      },
      payment_method: 'CREDIT_CARD',
      previous_average_amount: 2600,
      previous_transaction_count: 15,
      account_age_days: 45,
      high_frequency: false
    },
    threatNotes: 'Triggers High Amount Multiplier (5.5x) and New Hardware Device. Routed to manual/SMS 2FA Step-Up.'
  },
  {
    id: 'SAMPLE-04-SIM-SWAP-MIDNIGHT',
    name: '4. Critical SIM Swap & 38x Midnight Drain',
    category: 'HIGH_FRAUD_ALERT',
    description: 'Midnight drain attempt via international Linux emulator proxy at 03:42 AM.',
    expectedDecision: 'ALERT',
    expectedRiskTier: 'CRITICAL',
    payload: {
      transaction_id: 'TX_FRAUD_SIMSWAP_004',
      user_id: 'U_RAKSHITHA_101',
      amount: 95000,
      currency: 'INR',
      merchant: 'Offshore Crypto Bridge / FastExchange',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Moscow',
        country: 'RU',
        unusual_location: true,
        is_usual: false
      },
      device: {
        device_id: 'DEV_EMULATOR_SPOOF_PROXY_99',
        new_device: true,
        is_known: false
      },
      payment_method: 'CRYPTO',
      previous_average_amount: 2500,
      previous_transaction_count: 10,
      account_age_days: 2,
      high_frequency: true
    },
    threatNotes: '38x spend spike, brand new 2-day account, high-risk CRYPTO channel, offshore Moscow IP, emulator hardware.'
  },
  {
    id: 'SAMPLE-05-APK-PHISHING-MULE',
    name: '5. Electricity Bill APK Phishing Mule Transfer',
    category: 'HIGH_FRAUD_ALERT',
    description: 'Trojan screen-sharing malware transfer to flagged money mule VPA.',
    expectedDecision: 'ALERT',
    expectedRiskTier: 'CRITICAL',
    payload: {
      transaction_id: 'TX_FRAUD_APK_005',
      user_id: 'U_RAKSHITHA_101',
      amount: 48000,
      currency: 'INR',
      merchant: 'bescom-bill-update@ybl (Flagged Mule)',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Kolkata',
        country: 'IN',
        unusual_location: true,
        is_usual: false
      },
      device: {
        device_id: 'DEV_REMOTE_ANYDESK_HOOK',
        new_device: true,
        is_known: false
      },
      payment_method: 'GIFT_CARD',
      previous_average_amount: 1500,
      previous_transaction_count: 5,
      account_age_days: 4,
      high_frequency: true
    },
    threatNotes: '32x multiplier, new account age (4 days), gift card channel, new device, velocity surge.'
  },
  {
    id: 'SAMPLE-06-DIGITAL-ARREST-EXTORTION',
    name: '6. Digital Arrest / Fake Police Extortion Wire',
    category: 'HIGH_FRAUD_ALERT',
    description: 'High-value coercive transfer to fake "RBI Verification Account" under video intimidation.',
    expectedDecision: 'ALERT',
    expectedRiskTier: 'CRITICAL',
    payload: {
      transaction_id: 'TX_FRAUD_EXTORT_006',
      user_id: 'U_RAKSHITHA_101',
      amount: 150000,
      currency: 'INR',
      merchant: 'RBI Verification Safe Deposit Node (Fake Police)',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Dubai',
        country: 'AE',
        unusual_location: true,
        is_usual: false
      },
      device: {
        device_id: 'DEV_SUSPICIOUS_WEB_CLIENT',
        new_device: true,
        is_known: false
      },
      payment_method: 'WIRE',
      previous_average_amount: 2500,
      previous_transaction_count: 8,
      account_age_days: 5,
      high_frequency: true
    },
    threatNotes: 'Extreme 60x multiplier, unverified wire, abnormal location, brand-new account profile.'
  },
  {
    id: 'SAMPLE-07-DUPLICATE-REPLAY',
    name: '7. Idempotency Gate (Duplicate Replay Attack)',
    category: 'EDGE_CASE_VALIDATION',
    description: 'Submits identical transaction_id to verify n8n deduplication memory and HTTP 409 rejection.',
    expectedDecision: 'DUPLICATE',
    expectedRiskTier: 'ERROR',
    payload: {
      transaction_id: 'TX_LEGIT_001', // intentionally matches sample 1
      user_id: 'U_RAKSHITHA_101',
      amount: 850,
      currency: 'INR',
      merchant: 'Swiggy Instamart / Local Grocery',
      timestamp: new Date().toISOString(),
      location: {
        city: 'Bengaluru',
        country: 'IN',
        unusual_location: false,
        is_usual: true
      },
      device: {
        device_id: 'DEV_IPHONE_14_VERIFIED',
        new_device: false,
        is_known: true
      },
      payment_method: 'UPI',
      previous_average_amount: 1200,
      previous_transaction_count: 84,
      account_age_days: 365,
      high_frequency: false
    },
    threatNotes: 'Tests transaction deduplication node. If TX_LEGIT_001 was processed, workflow must return HTTP 409 DUPLICATE.'
  },
  {
    id: 'SAMPLE-08-MALFORMED-SCHEMA',
    name: '8. Schema Integrity Gate (Corrupted / Negative Payload)',
    category: 'EDGE_CASE_VALIDATION',
    description: 'Payload with negative amount and missing currency to test validation gate.',
    expectedDecision: 'REJECTED',
    expectedRiskTier: 'ERROR',
    payload: {
      transaction_id: 'TX_INVALID_008',
      user_id: 'U_CORRUPT_99',
      amount: -500, // Invalid negative amount
      currency: '', // Missing required currency
      merchant: 'Unknown Incomplete Stream',
      timestamp: 'INVALID_TIMESTAMP',
      location: {
        city: '',
        country: '',
        unusual_location: false,
        is_usual: false
      },
      device: {
        device_id: '',
        new_device: true,
        is_known: false
      },
      payment_method: 'UPI',
      previous_average_amount: 0,
      previous_transaction_count: 0,
      account_age_days: 0,
      high_frequency: false
    },
    threatNotes: 'Tests Node 1 (Validate Transaction). Must reject with HTTP 400 REJECTED and identify invalid fields.'
  }
];
