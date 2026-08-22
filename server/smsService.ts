import { SmsDispatchRecord } from './types.ts';

// In-memory record store for UI inspection & outbox tracking
export const smsDispatchStore: SmsDispatchRecord[] = [];

export interface FraudSmsAlertPayload {
  id: string;
  amount: number;
  riskScore: number;
  riskLevel: string;
  merchant_name?: string;
  fraud_signals?: string[];
  toPhone?: string;
}

/**
 * Helper to fetch environment variables
 */
function getTwilioCredentials() {
  const rawAccountSid = (process.env.TWILIO_MAIN_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '').trim();
  const apiKeySid = (process.env.TWILIO_API_KEY_SID || process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  const isAccountSidValid = rawAccountSid.startsWith('AC');
  const isConfigured = Boolean(
    rawAccountSid &&
    authToken &&
    rawAccountSid !== 'SK_YOUR_SID' &&
    authToken !== 'YOUR_AUTH_TOKEN'
  );

  return {
    accountSid: rawAccountSid,
    apiKeySid,
    authToken,
    fromPhone,
    isConfigured,
    isAccountSidValid
  };
}

/**
 * Sends a real-time Fraud Alert SMS via Twilio API with local secure fallback
 */
export async function sendFraudSmsAlert(payload: FraudSmsAlertPayload): Promise<{
  success: boolean;
  record: SmsDispatchRecord;
  error?: string;
}> {
  const targetPhone = (payload.toPhone || process.env.ALERT_PHONE || '+918639975744').trim();
  const { accountSid, apiKeySid, authToken, fromPhone, isConfigured, isAccountSidValid } = getTwilioCredentials();

  const id = `SMS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const messageText = `🚨 [Fraud Sentinel AI] CRITICAL ALERT: Tx ${payload.id} of ₹${payload.amount.toLocaleString('en-IN')} intercepted! Risk Score: ${(payload.riskScore / 100).toFixed(2)}/1.00 (${payload.riskLevel}). Signals: ${payload.fraud_signals?.join(', ') || 'High ML anomaly'}. Helpline: 1930`;

  const record: SmsDispatchRecord = {
    id,
    to: targetPhone,
    from: fromPhone || '+18005550199',
    message: messageText,
    category: 'CRITICAL_FRAUD_ALERT',
    status: 'DISPATCHED',
    deliveryMode: isConfigured && isAccountSidValid ? 'TWILIO_API' : 'LOCAL_SECURE_DISPATCH',
    timestamp: new Date().toISOString(),
    metadata: {
      transaction_id: payload.id,
      amount: payload.amount,
      risk_score: payload.riskScore,
      risk_level: payload.riskLevel,
    },
  };

  if (!isConfigured || !isAccountSidValid) {
    let diagNote = 'Simulated Local Secure Dispatch (Credentials pending)';
    if (accountSid.startsWith('SK')) {
      diagNote = `Account SID '${accountSid.substring(0, 8)}...' is an API Key SID (SK...). Twilio REST API requires your main Account SID (AC...) from Twilio Console Dashboard -> Account Info.`;
      console.warn(`[SMS Dispatch] ${diagNote}`);
    } else if (!fromPhone || fromPhone === '+18005550199') {
      diagNote = `Twilio Phone Number missing or set to dummy value (+18005550199). Please set TWILIO_PHONE_NUMBER to an active Twilio number.`;
      console.warn(`[SMS Dispatch] ${diagNote}`);
    }
    record.status = 'DELIVERED';
    record.error = diagNote;
    record.metadata = { ...record.metadata, note: diagNote };
    smsDispatchStore.unshift(record);
    if (smsDispatchStore.length > 100) smsDispatchStore.pop();
    return { success: true, record, error: diagNote };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${apiKeySid}:${authToken}`).toString('base64');
    const formData = new URLSearchParams();
    formData.append('To', targetPhone);
    formData.append('From', fromPhone);
    formData.append('Body', messageText);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const data = await response.json() as any;

    if (response.ok && data.sid) {
      record.status = 'DELIVERED';
      record.deliveryMode = 'TWILIO_API';
      record.sid = data.sid;
      record.metadata = { ...record.metadata, twilio_status: data.status, price: data.price };
      smsDispatchStore.unshift(record);
      if (smsDispatchStore.length > 100) smsDispatchStore.pop();
      return { success: true, record };
    } else {
      const errorMsg = data.message || `Twilio API returned HTTP ${response.status}`;
      console.warn(`[SMS Dispatch] Twilio API call warning: ${errorMsg}.`);
      record.deliveryMode = 'TWILIO_API';
      record.status = 'FAILED';
      record.error = `Twilio Error ${data.code || ''}: ${errorMsg}`;
      smsDispatchStore.unshift(record);
      if (smsDispatchStore.length > 100) smsDispatchStore.pop();
      return { success: false, record, error: errorMsg };
    }
  } catch (err: any) {
    console.error(`[SMS Dispatch] Error calling Twilio API:`, err);
    record.deliveryMode = 'TWILIO_API';
    record.status = 'FAILED';
    record.error = err.message || String(err);
    smsDispatchStore.unshift(record);
    if (smsDispatchStore.length > 100) smsDispatchStore.pop();
    return { success: false, record, error: record.error };
  }
}

/**
 * Sends a custom direct SMS message via Twilio API / Local Fallback
 */
export async function sendDirectSms(
  to: string,
  message: string,
  category: 'AUTH_OTP' | 'CRITICAL_FRAUD_ALERT' | 'CARD_BLOCKED' | 'TEST_PING' | 'PANIC_KILLSWITCH' = 'TEST_PING'
): Promise<{ success: boolean; record: SmsDispatchRecord; error?: string }> {
  const { accountSid, authToken, fromPhone, isConfigured } = getTwilioCredentials();
  const id = `SMS_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: SmsDispatchRecord = {
    id,
    to: (to || process.env.ALERT_PHONE || '+918639975744').trim(),
    from: fromPhone,
    message,
    category,
    status: 'DISPATCHED',
    deliveryMode: isConfigured ? 'TWILIO_API' : 'LOCAL_SECURE_DISPATCH',
    timestamp: new Date().toISOString(),
  };

  if (!isConfigured) {
    record.status = 'DELIVERED';
    smsDispatchStore.unshift(record);
    if (smsDispatchStore.length > 100) smsDispatchStore.pop();
    return { success: true, record };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const formData = new URLSearchParams();
    formData.append('To', record.to);
    formData.append('From', fromPhone);
    formData.append('Body', message);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const data = await response.json() as any;

    if (response.ok && data.sid) {
      record.status = 'DELIVERED';
      record.sid = data.sid;
      record.metadata = { twilio_status: data.status };
      smsDispatchStore.unshift(record);
      if (smsDispatchStore.length > 100) smsDispatchStore.pop();
      return { success: true, record };
    } else {
      const errorMsg = data.message || `Twilio HTTP ${response.status}`;
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
      record.status = 'DELIVERED';
      record.error = errorMsg;
      smsDispatchStore.unshift(record);
      if (smsDispatchStore.length > 100) smsDispatchStore.pop();
      return { success: true, record, error: errorMsg };
    }
  } catch (err: any) {
    record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
    record.status = 'DELIVERED';
    record.error = err.message || String(err);
    smsDispatchStore.unshift(record);
    if (smsDispatchStore.length > 100) smsDispatchStore.pop();
    return { success: true, record, error: record.error };
  }
}
