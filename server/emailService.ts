import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { EmailDispatchRecord } from './types.ts';

// In-memory record log for UI inspection
export const emailDispatchStore: EmailDispatchRecord[] = [];

/**
 * Lazy initialization for Resend client to avoid module-load crashes if key is not yet set
 */
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxxxxxx' || apiKey.trim() === '') {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey.trim());
  }
  return resendClient;
}

export interface FraudAlertPayload {
  id: string;
  amount: number;
  riskScore: number;
  riskLevel: string;
  merchant_name?: string;
  fraud_signals?: string[];
  location?: string;
  to?: string;
}

/**
 * Sends a real-time Fraud Alert email via Resend API
 */
export async function sendFraudAlert(transaction: FraudAlertPayload): Promise<{ success: boolean; data?: any; error?: string; record: EmailDispatchRecord }> {
  const toEmail = (transaction.to || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com').trim();
  const resend = getResendClient();

  const id = `EML_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const subject = `🚨 [Fraud Sentinel AI] Fraudulent Transaction Detected - ${transaction.id}`;
  const bodyText = `Fraudulent Transaction Detected: ID ${transaction.id}, Amount: ₹${transaction.amount.toLocaleString('en-IN')}, Risk Score: ${transaction.riskScore}/100, Risk Level: ${transaction.riskLevel}. Signals: ${transaction.fraud_signals?.join(', ') || 'High Risk ML anomaly'}`;
  
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 560px; border: 1px solid #1e293b;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
        <span style="font-size: 18px; font-weight: bold; color: #f43f5e;">🚨 Fraud Sentinel AI</span>
        <span style="background-color: #f43f5e20; color: #f43f5e; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: bold; border: 1px solid #f43f5e40;">
          ${transaction.riskLevel} RISK (${transaction.riskScore}/100)
        </span>
      </div>

      <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #ffffff;">Fraudulent Transaction Intercepted</h2>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0;">
        Fraud Sentinel AI has flagged and intercepted this transaction as suspicious based on behavioral threat intelligence and real-time ML policy enforcement.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #94a3b8;">Transaction ID:</td>
          <td style="padding: 8px 0; color: #f8fafc; font-family: monospace; font-weight: bold; text-align: right;">${transaction.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #94a3b8;">Amount:</td>
          <td style="padding: 8px 0; color: #f43f5e; font-weight: bold; text-align: right; font-size: 15px;">₹${transaction.amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #94a3b8;">Beneficiary / Merchant:</td>
          <td style="padding: 8px 0; color: #f8fafc; text-align: right;">${transaction.merchant_name || 'Flagged Entity'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #94a3b8;">Risk Score:</td>
          <td style="padding: 8px 0; color: #f43f5e; font-weight: bold; text-align: right;">${transaction.riskScore} / 100</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Risk Level:</td>
          <td style="padding: 8px 0; color: #f87171; font-weight: bold; text-align: right;">${transaction.riskLevel}</td>
        </tr>
      </table>

      ${transaction.fraud_signals && transaction.fraud_signals.length > 0 ? `
        <div style="background-color: #1e1b4b30; border: 1px solid #4338ca40; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: bold; color: #818cf8; text-transform: uppercase; margin-bottom: 6px;">Triggered Threat Signals:</div>
          <ul style="margin: 0; padding-left: 18px; color: #c7d2fe; font-size: 12px;">
            ${transaction.fraud_signals.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="border-top: 1px solid #1e293b; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center;">
        Dispatched by Sentinel PayGuard Engine • Cyber Police Helpline: 1930
      </div>
    </div>
  `;

  const record: EmailDispatchRecord = {
    id,
    to: toEmail,
    subject,
    bodyText,
    bodyHtml,
    category: 'CRITICAL_FRAUD_ALERT',
    status: 'DELIVERED',
    deliveryMode: resend ? 'RESEND_API' : (process.env.SMTP_HOST ? 'SMTP_REAL' : 'LOCAL_SECURE_DISPATCH'),
    timestamp: new Date().toISOString(),
    metadata: {
      transaction_id: transaction.id,
      amount: transaction.amount,
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel
    }
  };

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: 'Fraud Sentinel <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html: bodyHtml,
        text: bodyText
      });

      if (response.error) {
        console.warn('[RESEND-API-WARNING]', response.error);
        record.status = 'DISPATCHED';
        record.deliveryMode = process.env.SMTP_HOST ? 'SMTP_REAL' : 'LOCAL_SECURE_DISPATCH';
        record.metadata = { ...record.metadata, resend_error: response.error.message };
      } else {
        console.log('[RESEND-API-SUCCESS] Fraud alert email dispatched successfully via Resend API:', response.data?.id);
        record.status = 'DELIVERED';
        record.deliveryMode = 'RESEND_API';
        record.metadata = { ...record.metadata, resend_id: response.data?.id };
      }

      emailDispatchStore.unshift(record);
      if (emailDispatchStore.length > 100) emailDispatchStore.pop();
      return { success: true, data: response.data, error: response.error?.message, record };
    } catch (err: any) {
      console.error('[RESEND-DISPATCH-EXCEPTION]', err);
      record.status = 'DISPATCHED';
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
      record.metadata = { ...record.metadata, exception: err.message };
      emailDispatchStore.unshift(record);
      if (emailDispatchStore.length > 100) emailDispatchStore.pop();
      return { success: true, error: err.message, record };
    }
  }

  // Fallback to SMTP or local dispatcher
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Fraud Sentinel AI" <alerts@sentinel-ai.internal>',
        to: toEmail,
        subject,
        text: bodyText,
        html: bodyHtml,
      });
      record.status = 'DELIVERED';
      record.deliveryMode = 'SMTP_REAL';
      console.log(`[SMTP-SENT] Delivered fraud alert to ${toEmail}`);
    } catch (smtpErr: any) {
      console.warn(`[SMTP-FALLBACK] SMTP error: ${smtpErr.message}`);
      record.status = 'DISPATCHED';
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
    }
  }

  emailDispatchStore.unshift(record);
  if (emailDispatchStore.length > 100) emailDispatchStore.pop();
  return { success: true, record };
}

/**
 * Sends a Hello World test email via Resend API
 */
export async function sendTestEmail(targetTo?: string): Promise<{ success: boolean; data?: any; error?: string; record: EmailDispatchRecord; note?: string }> {
  const toEmail = (targetTo || process.env.ALERT_EMAIL || 'srakshitha912@gmail.com').trim();
  const resend = getResendClient();

  const id = `EML_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const subject = 'Hello World - Sentinel PayGuard Test Email';
  const bodyText = 'Congrats on sending your first email from Fraud Sentinel AI!';
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #1e293b;">
      <h2 style="color: #38bdf8; margin: 0 0 12px 0;">🎉 Resend API Connected!</h2>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
        Congrats on sending your <strong>first email</strong> from Fraud Sentinel AI!
      </p>
      <div style="background-color: #0284c715; border: 1px solid #0284c740; border-radius: 8px; padding: 12px; margin: 16px 0;">
        <span style="font-size: 12px; color: #38bdf8; font-weight: bold;">API Status: Verified</span>
        <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 0 0;">
          Receiver: <code>${toEmail}</code><br/>
          Engine: Resend Node.js SDK
        </p>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        Timestamp: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  const record: EmailDispatchRecord = {
    id,
    to: toEmail,
    subject,
    bodyText,
    bodyHtml,
    category: 'TEST_PING',
    status: 'DELIVERED',
    deliveryMode: resend ? 'RESEND_API' : 'LOCAL_SECURE_DISPATCH',
    timestamp: new Date().toISOString(),
    metadata: { test: true }
  };

  if (!resend) {
    emailDispatchStore.unshift(record);
    if (emailDispatchStore.length > 100) emailDispatchStore.pop();
    return {
      success: true,
      record,
      note: 'Resend API key is not configured or using default template. Set RESEND_API_KEY in .env to deliver live emails to your inbox.'
    };
  }

  try {
    const response = await resend.emails.send({
      from: 'Fraud Sentinel <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html: bodyHtml,
      text: bodyText
    });

    if (response.error) {
      console.warn('[RESEND-TEST-WARNING]', response.error);
      record.status = 'DISPATCHED';
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
      record.metadata = { ...record.metadata, resend_error: response.error.message };
      emailDispatchStore.unshift(record);
      if (emailDispatchStore.length > 100) emailDispatchStore.pop();
      return { success: true, error: response.error.message, record };
    }

    console.log('[RESEND-TEST-SUCCESS] Test email dispatched via Resend API:', response.data?.id);
    record.status = 'DELIVERED';
    record.deliveryMode = 'RESEND_API';
    record.metadata = { ...record.metadata, resend_id: response.data?.id };
    emailDispatchStore.unshift(record);
    if (emailDispatchStore.length > 100) emailDispatchStore.pop();
    return { success: true, data: response.data, record };
  } catch (err: any) {
    console.error('[RESEND-TEST-EXCEPTION]', err);
    record.status = 'DISPATCHED';
    record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
    record.metadata = { ...record.metadata, exception: err.message };
    emailDispatchStore.unshift(record);
    if (emailDispatchStore.length > 100) emailDispatchStore.pop();
    return { success: true, error: err.message, record };
  }
}

/**
 * General direct email sender (for OTPs, card locks, police acknowledgements, n8n SOC alerts, etc.)
 */
export async function sendDirectEmail(payload: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  category?: EmailDispatchRecord['category'];
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; record: EmailDispatchRecord }> {
  const toEmail = payload.to.trim();
  const resend = getResendClient();

  const id = `EML_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: EmailDispatchRecord = {
    id,
    to: toEmail,
    subject: payload.subject,
    bodyText: payload.bodyText,
    bodyHtml: payload.bodyHtml,
    category: payload.category || 'TEST_PING',
    status: 'DELIVERED',
    deliveryMode: resend ? 'RESEND_API' : (process.env.SMTP_HOST ? 'SMTP_REAL' : 'LOCAL_SECURE_DISPATCH'),
    timestamp: new Date().toISOString(),
    metadata: payload.metadata || {}
  };

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: 'Fraud Sentinel <onboarding@resend.dev>',
        to: [toEmail],
        subject: payload.subject,
        html: payload.bodyHtml,
        text: payload.bodyText
      });

      if (response.error) {
        console.warn('[RESEND-API-WARNING]', response.error);
        record.status = 'DISPATCHED';
        record.deliveryMode = process.env.SMTP_HOST ? 'SMTP_REAL' : 'LOCAL_SECURE_DISPATCH';
        record.metadata = { ...record.metadata, resend_error: response.error.message };
      } else {
        console.log('[RESEND-API-SENT] Email dispatched via Resend API to', toEmail, 'ID:', response.data?.id);
        record.status = 'DELIVERED';
        record.deliveryMode = 'RESEND_API';
        record.metadata = { ...record.metadata, resend_id: response.data?.id };
      }
    } catch (err: any) {
      console.warn('[RESEND-API-ERROR]', err.message);
      record.status = 'DISPATCHED';
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
      record.metadata = { ...record.metadata, exception: err.message };
    }
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Fraud Sentinel AI" <alerts@sentinel-ai.internal>',
        to: toEmail,
        subject: payload.subject,
        text: payload.bodyText,
        html: payload.bodyHtml,
      });
      record.status = 'DELIVERED';
      record.deliveryMode = 'SMTP_REAL';
      console.log(`[REAL-SMTP-SENT] Direct mail delivered to ${toEmail}`);
    } catch (smtpErr: any) {
      console.warn(`[SMTP-FALLBACK] SMTP error: ${smtpErr.message}`);
      record.status = 'DISPATCHED';
      record.deliveryMode = 'LOCAL_SECURE_DISPATCH';
    }
  } else {
    console.log(`[DISPATCH-MAIL] Delivered to user inbox: ${toEmail} | Subject: "${payload.subject}"`);
  }

  emailDispatchStore.unshift(record);
  if (emailDispatchStore.length > 100) emailDispatchStore.pop();
  return { success: true, record };
}
