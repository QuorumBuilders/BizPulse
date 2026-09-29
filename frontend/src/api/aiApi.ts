/**
 * AI voice transcription client. Sends audio to POST /api/ai/transcribe/
 * and returns schema-extracted structured data.
 */

import { getAccessToken, silentRefresh } from '../state/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type VoiceIntent = 'daily_tally' | 'credit_sale' | 'repayment';

export interface DailyTallyExtractedData {
  date: string | null;
  cash_sales: string | null;
  expenses: string | null;
  note: string | null;
}

export interface CreditSaleExtractedData {
  customer: string | null;
  amount: string | null;
  issued_date: string | null;
  due_date: string | null;
}

export interface RepaymentExtractedData {
  customer: string | null;
  amount: string | null;
  paid_date: string | null;
}

export interface GeneralExtractionItem {
  intent: 'daily_tally' | 'credit_sale' | 'repayment' | 'none';
  data: {
    date: string | null;
    cash_sales: string | null;
    expenses: string | null;
    note: string | null;
    customer: string | null;
    amount: string | null;
    issued_date: string | null;
    due_date: string | null;
    paid_date: string | null;
  };
}

export interface GeneralExtractedResults {
  results: GeneralExtractionItem[];
}

export interface TranscriptionResponse<T = DailyTallyExtractedData | CreditSaleExtractedData | RepaymentExtractedData | GeneralExtractedResults> {
  transcription: string;
  language: string;
  results: T;
}

export class AiApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AiApiError';
  }
}

export async function apiTranscribeAudio<T = unknown>(
  audio: Blob | File,
  intent?: VoiceIntent,
  filename = 'recording.webm',
  _isRetry = false
): Promise<TranscriptionResponse<T>> {
  console.log("apiTranscribe: ",audio, intent, filename);
  const token = getAccessToken();
  const formData = new FormData();

  if (audio instanceof File) {
    formData.append('audio', audio);
  } else {
    formData.append('audio', audio, filename);
  }

  if (intent) {
    formData.append('intent', intent);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/ai/transcribe/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401 && !_isRetry) {
    try {
      await silentRefresh();
    } catch {
      throw new AiApiError(401, 'Session expired. Please log in again.');
    }
    return apiTranscribeAudio<T>(audio, intent, filename, true);
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const message =
      res.status === 429
        ? 'Voice transcription rate limit exceeded (10/min). Please wait a moment.'
        : `Voice transcription failed (${res.status})`;
    throw new AiApiError(res.status, message, errBody);
  }

  const json = await res.json();
  // Unwrap { data: { transcription, language, results }, meta: {} }
  return (json.data ?? json) as TranscriptionResponse<T>;
}
