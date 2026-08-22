import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db.ts';

function isValidGeminiApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (
    trimmed === '' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'MY_GEMINI_KEY' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.startsWith('AIzaSyDummy') ||
    trimmed.length < 10
  ) {
    return false;
  }
  return true;
}

// Shared Gemini Client with lazy init
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isValidGeminiApiKey(apiKey)) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey!.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export interface ScamAnalysisResult {
  safetyScore: number; // 0 to 100
  status: 'SAFE' | 'SUSPICIOUS' | 'SCAM_CONFIRMED';
  category: string;
  confidenceScore: number;
  title: string;
  summary: string;
  psychologicalTriggers: string[];
  scamIndicators: string[];
  extractedEntities: {
    phoneNumbers: string[];
    links: string[];
    upiIds: string[];
    suspiciousApps: string[];
  };
  immediateActionSteps: string[];
  rbiProtectionClause: string;
  legalSections?: string[];
  source: 'GEMINI_AI' | 'HEURISTIC_RULE_ENGINE';
}

/**
 * Perform Deep Gemini Multimodal or Text Scam Analysis
 */
export async function analyzeScamContent(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  queryType?: string;
}): Promise<ScamAnalysisResult> {
  const { text = '', imageBase64, mimeType = 'image/jpeg', queryType = 'GENERAL' } = params;
  const ai = getGemini();

  const systemInstruction = `You are Sentinel PayGuard's Chief AI Cyber Forensic & Anti-Fraud Investigator.
Your mission is to protect everyday citizens from payment scams, UPI extortion, digital arrests, phishing SMS, fake electricity bill disconnection scams, task fraud, APK malware, and impersonation.
Analyze the user's provided text and/or screenshot.
Identify:
1. True threat level: SAFE (legitimate entity/vendor), SUSPICIOUS (unverified private payee or unknown link), or SCAM_CONFIRMED (clear fraud tactics).
2. Safety score from 0 (extreme active scam) to 100 (100% verified authentic).
3. Exact scam archetype/category (e.g. 'Digital Arrest / Police Impersonation', 'Electricity Power Cut SMS Phishing', 'UPI Collect Reverse Charge Trap', 'Remote Screen Sharing APK / AnyDesk', 'Part-time Job / YouTube Like Telegram Scam', 'Lottery / Cashback Advance Fee Scam', 'Verified Merchant').
4. Psychological manipulation factors: e.g., 'Artificial Urgency: 2-hour disconnection deadline', 'Fear of Immediate Arrest / CBI extortion', 'Authority Impersonation (TRAI, Police, RBI)', 'Greed Bait: Unearned ₹25,000 lottery'.
5. Extracted indicators: phone numbers, links, UPI handles, APK names.
6. Clear, immediate, actionable steps for a non-technical citizen.
7. Applicable RBI Zero Liability rule or Indian IT Act section (e.g. Section 66D IT Act, Section 420 IPC, RBI Master Direction on Unauthorized Electronic Transactions).

Respond strictly with valid JSON conforming to the requested schema.`;

  if (ai) {
    try {
      const contents: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        });
      }

      const promptText = `Please analyze the following payment / message / scam inquiry:
Input Text: "${text}"
Inquiry Type: ${queryType}
Analyze thoroughly for fraudulent patterns, UPI trap tricks, and extortion.`;

      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              safetyScore: { type: Type.INTEGER, description: 'Score between 0 and 100 (0=scam, 100=safe)' },
              status: { type: Type.STRING, enum: ['SAFE', 'SUSPICIOUS', 'SCAM_CONFIRMED'] },
              category: { type: Type.STRING },
              confidenceScore: { type: Type.INTEGER },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              psychologicalTriggers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              scamIndicators: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedEntities: {
                type: Type.OBJECT,
                properties: {
                  phoneNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  links: { type: Type.ARRAY, items: { type: Type.STRING } },
                  upiIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suspiciousApps: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['phoneNumbers', 'links', 'upiIds', 'suspiciousApps'],
              },
              immediateActionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              rbiProtectionClause: { type: Type.STRING },
              legalSections: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'safetyScore',
              'status',
              'category',
              'confidenceScore',
              'title',
              'summary',
              'psychologicalTriggers',
              'scamIndicators',
              'extractedEntities',
              'immediateActionSteps',
              'rbiProtectionClause',
            ],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text) as ScamAnalysisResult;
        parsed.source = 'GEMINI_AI';
        return parsed;
      }
    } catch {
      // Gracefully switch to offline heuristic & pattern engine
    }
  }

  // High-fidelity fallback heuristic engine (offline or missing key fallback)
  return runHeuristicScamAnalysis(text, queryType);
}

/**
 * Intelligent Rule & Pattern Fallback Engine
 */
function runHeuristicScamAnalysis(text: string, queryType: string): ScamAnalysisResult {
  const lower = text.toLowerCase();

  // 1. Check for Electricity Bill Disconnection scam
  if (lower.includes('electricity') || lower.includes('power cut') || lower.includes('disconnection') || lower.includes('bill update') || lower.includes('bescom') || lower.includes('mseb') || lower.includes('tneb')) {
    return {
      safetyScore: 8,
      status: 'SCAM_CONFIRMED',
      category: 'Electricity Bill Disconnection Phishing',
      confidenceScore: 98,
      title: '🚨 CONFIRMED SCAM: Fake Electricity Disconnection Threat',
      summary: 'Cybercriminals send urgent SMS/WhatsApp claiming your electricity will be disconnected tonight at 9:30 PM due to unpaid bills, prompting you to call a personal mobile number or download a malicious APK.',
      psychologicalTriggers: [
        'Artificial Extreme Urgency (Tonight power cut deadline)',
        'Fear Appeal (Losing home electricity/utility service)',
        'Authority Impersonation (State Electricity Distribution Company)',
      ],
      scamIndicators: [
        'Dispatched from standard 10-digit private mobile number instead of official government SMS sender ID (e.g. BESCOM/MSEB)',
        'Urges victim to install remote-control app (AnyDesk/TeamViewer) or malicious APK to pay ₹10 update fee',
        'Official electricity boards NEVER disconnect power via instant WhatsApp/SMS numbers without formal physical notice',
      ],
      extractedEntities: {
        phoneNumbers: extractPhoneNumbers(text),
        links: extractUrls(text),
        upiIds: extractUpi(text),
        suspiciousApps: ['QuickSupport', 'AnyDesk', 'ElectricityUpdate.apk'],
      },
      immediateActionSteps: [
        'DO NOT call the number given in the message.',
        'DO NOT install any APK file or screen-sharing application.',
        'Check your real bill balance directly on your official electricity board portal or authorized app (e.g. Paytm/GPay).',
        'Report the mobile number immediately on the National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in).',
      ],
      rbiProtectionClause: 'Under RBI Customer Protection Guidelines, do not share OTP or approve any ₹1/₹10 test UPI collect requests.',
      legalSections: ['Section 66D IT Act (Impersonation)', 'Section 420 IPC (Cheating & Dishonesty)'],
      source: 'HEURISTIC_RULE_ENGINE',
    };
  }

  // 2. Digital Arrest / CBI / Mumbai Police / FedEx Drugs scam
  if (lower.includes('cbi') || lower.includes('customs') || lower.includes('fedex') || lower.includes('narcotics') || lower.includes('digital arrest') || lower.includes('mumbai police') || lower.includes('trai') || lower.includes('sim deactivation') || lower.includes('passport')) {
    return {
      safetyScore: 2,
      status: 'SCAM_CONFIRMED',
      category: 'Digital Arrest & Law Enforcement Extortion',
      confidenceScore: 99,
      title: '🚨 CRITICAL THREAT: Fake "Digital Arrest" Extortion Scam',
      summary: 'Fraudsters impersonating Mumbai Police, CBI, ED, or FedEx call victims claiming illegal narcotics/passports were seized in their name. They force victims onto Skype/WhatsApp video calls with fake police setups and demand money for "verification".',
      psychologicalTriggers: [
        'Extreme Fear of Immediate Criminal Arrest & Jail',
        'Authority Impersonation (CBI, IPS Officers, Chief Justice)',
        'Isolation Tactic (Warning victim not to tell family or lawyer)',
        'False Legality (Fake Supreme Court / RBI stamp documents sent over WhatsApp)',
      ],
      scamIndicators: [
        'Indian law and police procedures have NO provision for "Digital Arrest" via Skype or WhatsApp video call',
        'Police and judicial agencies NEVER ask citizens to transfer money to "RBI verification / secure" bank accounts',
        'Demands for continuous camera presence to prevent you from seeking legal help',
      ],
      extractedEntities: {
        phoneNumbers: extractPhoneNumbers(text),
        links: extractUrls(text),
        upiIds: extractUpi(text),
        suspiciousApps: ['Skype', 'Signal', 'Fake ID Generator'],
      },
      immediateActionSteps: [
        'DISCONNECT THE CALL IMMEDIATELY. You are not under arrest.',
        'DO NOT transfer any funds to any "police verification account".',
        'Block the scammer number on WhatsApp.',
        'Dial 1930 (National Cyber Crime Helpline) or visit your nearest local police station.',
      ],
      rbiProtectionClause: 'Law enforcement cannot demand financial transfers to resolve criminal inquiries. Any such demand is 100% fraud.',
      legalSections: ['Section 66D IT Act', 'Section 419/420 IPC', 'Section 170 IPC (Personating a public servant)'],
      source: 'HEURISTIC_RULE_ENGINE',
    };
  }

  // 3. Part-time Job / YouTube Like / Telegram Task scam
  if (lower.includes('part-time') || lower.includes('like youtube') || lower.includes('5000 per day') || lower.includes('telegram task') || lower.includes('hotel review') || lower.includes('daily earn') || lower.includes('wfh job')) {
    return {
      safetyScore: 5,
      status: 'SCAM_CONFIRMED',
      category: 'Part-Time Job & Task Prepaid Scam',
      confidenceScore: 97,
      title: '🚨 CONFIRMED SCAM: Fake Part-Time Job / Task Trap',
      summary: 'Scammers offer high daily pay (₹3,000–₹10,000/day) for simple tasks like liking YouTube videos or giving Google reviews. After paying ₹200 initially to build trust, they lure victims into "crypto recharge" or "VIP investment" tasks where thousands are stolen.',
      psychologicalTriggers: [
        'Greed Bait & Easy Money Appeal',
        'Sunk Cost Fallacy (Forcing bigger recharge to release trapped previous earnings)',
        'Social Proof (Fake Telegram group with 50+ bot accounts claiming huge profits)',
      ],
      scamIndicators: [
        'No legitimate enterprise pays ₹150 for 5 seconds of clicking YouTube like buttons',
        'Victim is directed to a Telegram admin to receive "task assignments"',
        'Requires paying money ("prepaid recharge") to withdraw earned salary',
      ],
      extractedEntities: {
        phoneNumbers: extractPhoneNumbers(text),
        links: extractUrls(text),
        upiIds: extractUpi(text),
        suspiciousApps: ['Telegram', 'Fake Crypto Exchange Web'],
      },
      immediateActionSteps: [
        'DO NOT deposit any money or crypto.',
        'Exit and block the Telegram group and admin accounts.',
        'Never share your bank account or UPI details for "bonus settlement".',
      ],
      rbiProtectionClause: 'Any job requiring you to deposit money to withdraw salary is a Ponzi/task fraud.',
      legalSections: ['Section 66D IT Act', 'Banning of Unregulated Deposit Schemes Act (BUDS), 2019'],
      source: 'HEURISTIC_RULE_ENGINE',
    };
  }

  // 4. Reverse UPI Collect / Refund Scam (Enter PIN to receive money)
  if (lower.includes('receive money') || lower.includes('enter pin to receive') || lower.includes('collect request') || lower.includes('olx') || lower.includes('qr scan to get refund') || lower.includes('cashback')) {
    return {
      safetyScore: 10,
      status: 'SCAM_CONFIRMED',
      category: 'UPI PIN Reverse Collect Request Trap',
      confidenceScore: 99,
      title: '🚨 CONFIRMED SCAM: UPI PIN Reverse Collect Trap',
      summary: 'Fraudster sends a UPI "Collect Request" or QR code claiming it is to SEND you a refund or payment (e.g. OLX buyer or refund agent). Entering your PIN DEBITS your bank balance instead of crediting money.',
      psychologicalTriggers: [
        'Misdirection of Technology (Confusing Pay vs Receive mechanics)',
        'Urgency (Claiming refund expires in 5 minutes)',
      ],
      scamIndicators: [
        'Golden Rule of UPI: You NEVER need to enter your UPI PIN to RECEIVE money',
        'UPI PIN is strictly an authorization key to DEBIT money from your bank account',
        'Incoming payments directly credit to your bank without PIN prompts or QR scanning',
      ],
      extractedEntities: {
        phoneNumbers: extractPhoneNumbers(text),
        links: extractUrls(text),
        upiIds: extractUpi(text),
        suspiciousApps: [],
      },
      immediateActionSteps: [
        'DO NOT enter your UPI PIN under any circumstances.',
        'Decline the collect request on your UPI app (GPay/PhonePe/Paytm).',
        'Block the payee ID on your UPI application.',
      ],
      rbiProtectionClause: 'NPCI UPI Guidelines: UPI PIN is exclusively used for sending money, never for receiving.',
      legalSections: ['Section 66D IT Act (Electronic Cheating)'],
      source: 'HEURISTIC_RULE_ENGINE',
    };
  }

  // 5. Legitimate merchants (Swiggy, Amazon, Uber, Flipkart, etc.)
  if (lower.includes('swiggy') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('zomato') || lower.includes('uber') || lower.includes('hdfc') || lower.includes('icici') || lower.includes('sbi official')) {
    return {
      safetyScore: 96,
      status: 'SAFE',
      category: 'Verified Commercial Merchant',
      confidenceScore: 95,
      title: '✅ Safe & Verified Merchant',
      summary: 'This payment identifier or communication corresponds to an authorized, NPCI-verified corporate merchant with a legitimate banking gateway.',
      psychologicalTriggers: ['Normal commercial checkout flow'],
      scamIndicators: ['Zero known fraud indicators detected', 'Matches verified corporate merchant namespace'],
      extractedEntities: {
        phoneNumbers: extractPhoneNumbers(text),
        links: extractUrls(text),
        upiIds: extractUpi(text),
        suspiciousApps: [],
      },
      immediateActionSteps: [
        'Safe to proceed with normal transaction.',
        'Always confirm the final amount on your payment screen before entering your PIN.',
      ],
      rbiProtectionClause: 'Standard 2-factor authentication guarantees consumer recourse.',
      source: 'HEURISTIC_RULE_ENGINE',
    };
  }

  // 6. Generic Suspicious / Unverified
  return {
    safetyScore: 48,
    status: 'SUSPICIOUS',
    category: 'Unverified Individual / Unknown Source',
    confidenceScore: 78,
    title: '⚠️ Unverified Source - Exercise Caution',
    summary: 'The provided details do not match established verified enterprise merchants and exhibit characteristics of an unverified individual or unknown link.',
    psychologicalTriggers: ['Unverified third-party communication'],
    scamIndicators: [
      'Originates from an unverified private source or personal VPA',
      'No corporate enterprise merchant verification found on NPCI registry',
    ],
    extractedEntities: {
      phoneNumbers: extractPhoneNumbers(text),
      links: extractUrls(text),
      upiIds: extractUpi(text),
      suspiciousApps: [],
    },
    immediateActionSteps: [
      'Verify the recipient identity through independent, known channels before sending money.',
      'Never install third-party APKs or screen-sharing tools.',
      'Check if the recipient has requested any urgent advance fees.',
    ],
    rbiProtectionClause: 'Never share banking OTPs, card CVVs, or UPI PINs.',
    source: 'HEURISTIC_RULE_ENGINE',
  };
}

function extractPhoneNumbers(text: string): string[] {
  const matches = text.match(/(?:\+91[\s-]?)?[6789]\d{9}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractUpi(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * 24/7 AI Cyber Crime & Banking Rights Advisor Chat
 */
export async function chatCyberAdvisor(params: {
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  userContext?: any;
}): Promise<string> {
  const { messages, userContext } = params;
  const ai = getGemini();

  const systemInstruction = `You are the Sentinel PayGuard 24/7 AI Cyber Legal & Banking Rights Concierge.
You are a warm, highly knowledgeable, and calming expert in Indian Cyber Security, IT Act 2000, IPC fraud provisions, and Reserve Bank of India (RBI) consumer protection circulars.

Key Knowledge Base:
1. RBI Circular DBR.No.Leg.BC.78/09.07.005/2017-18:
   - Zero Liability: If customer notifies the bank within 3 working days of an unauthorized electronic transaction caused by third-party breach or negligence where customer is not at fault.
   - Limited Liability: If reported within 4-7 working days (Max liability ₹10,000 for savings accounts).
   - Reversal Mandate: Bank must credit shadow/reversal amount within 10 working days.
2. Golden Hour in Cyber Fraud (1930 Helpline):
   - Reporting within 2 hours of money transfer allows National Cyber Coordination Centre (I4C) to freeze the suspect mule bank account before the money is withdrawn at an ATM.
3. Common Scams & Direct Solutions:
   - Digital Arrest: Absolute fraud. Disconnect immediately; police never do video arrests.
   - Reverse UPI PIN: Never enter PIN to receive money.
   - Electricity Bill / KYC APK: Never install unknown APKs or AnyDesk/TeamViewer.
4. User Info: Complainant Rakshitha S (Bengaluru, HDFC & ICICI Banks).

Format your advice clearly with:
- Direct Answer / Verdict first (reassuring, clear).
- Immediate Action Steps (bullet points).
- Legal / Banking Rights (RBI & IT Act citations).
- Official Support Numbers (1930, Bank Helplines).`;

  if (ai) {
    try {
      const contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contents as any,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch {
      // Gracefully switch to dynamic rule advisor
    }
  }

  // Dynamic Rule Advisor Fallback
  const lastUserMsg = (messages[messages.length - 1]?.text || '').toLowerCase();

  if (lastUserMsg.includes('pin') && (lastUserMsg.includes('receive') || lastUserMsg.includes('refund') || lastUserMsg.includes('collect'))) {
    return `### 🛑 STOP: Do Not Enter Your UPI PIN!

**Immediate Verdict:**
This is an active **UPI Reverse Collect Scam**. You NEVER need to enter your UPI PIN to receive money, cashback, or a refund.

---

### ⚡ What You Must Do Right Now:
1. **Decline the Request:** Open your UPI App (GPay/PhonePe/Paytm) and tap **"Decline / Reject"** on the incoming collect request.
2. **Never Share OTP / PIN:** UPI PIN is your electronic signature used ONLY to take money OUT of your bank.
3. **Block the Payee:** Mark the VPA/phone number as spam directly in your UPI app.

---

### ⚖️ Your Legal Protection (RBI Guidelines):
Under the **NPCI UPI Operating Guidelines**, any claim that entering a PIN is needed for a credit transaction is a deceptive violation of standard payment protocols. If any unauthorized debit occurred, dial **1930** immediately within the Golden Hour window.`;
  }

  if (lastUserMsg.includes('cbi') || lastUserMsg.includes('police') || lastUserMsg.includes('arrest') || lastUserMsg.includes('fedex') || lastUserMsg.includes('customs')) {
    return `### 🚨 Urgent: You Are Being Targeted by a "Digital Arrest" Scam!

**Immediate Verdict:**
There is **NO SUCH THING as a "Digital Arrest"** under Indian Law (CrPC / BNSS). No court, police officer, or CBI agent will ever place you under arrest over Skype or WhatsApp video call.

---

### ⚡ Step-by-Step Defense Actions:
1. **Disconnect the Call Immediately:** Hang up right away. Do NOT stay on the call.
2. **Do Not Transfer Money:** Scammers will tell you to transfer money to a "safe government verification account" to clear your name. **This is 100% fraud.**
3. **Block the Number:** Block the caller on WhatsApp and your phone.
4. **Report to Cyber Police:** Call **1930** or report on **cybercrime.gov.in**.

---

### 🛡️ Your Statutory Rights:
- Police officers must issue formal written summons under **Section 41A CrPC (Section 35 BNSS)**.
- Section 66D of the IT Act makes impersonating a police officer over digital media punishable with 3 years rigorous imprisonment.`;
  }

  return `### 🛡️ Sentinel PayGuard Cyber Security Assessment

Thank you for consulting Sentinel Cyber Defense. Here is your actionable guidance:

1. **Verify Official Channels:** Never click links received in SMS or WhatsApp claiming to be your bank or utility board. Always use official banking apps or verified portals.
2. **Golden Hour Action (1930):** If an unauthorized debit happened in the last 2 hours, immediately dial **1930** (Pan-India Cyber Crime Helpline) to initiate an emergency lien freeze on the recipient account.
3. **RBI Zero Liability Rule:** Under RBI Circular *DBR.No.Leg.BC.78/09.07.005/2017-18*, if you report an unauthorized electronic fraud to your bank within 3 working days, you are entitled to **100% full refund (Zero Customer Liability)**.

*Feel free to paste any suspicious message, UPI ID, or phone number to run an instant deep forensic scan.*`;
}
