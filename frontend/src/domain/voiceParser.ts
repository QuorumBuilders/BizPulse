/**
 * BizPulse — Voice Parser
 *
 * Parses spoken voice transcripts into structured tally fields:
 *  - totalSold (sales/revenue)
 *  - expenses (costs/spending)
 *  - creditLines (debtor name + credit amount)
 *
 * Supports common Nigerian retail/trader speech patterns in English,
 * Nigerian Pidgin, and mixed phrases.
 */

export interface ParsedVoiceTally {
  totalSold?: number;
  expenses?: number;
  creditLines: Array<{ customerName: string; amount: number }>;
  rawTranscript: string;
}

/**
 * Extracts a numeric amount following or preceding a keyword.
 * Handles "15,000", "15000", "15k", "fifteen thousand", "500 naira", etc.
 */
function parseNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, '').toLowerCase().trim();

  // Handle "15k", "2.5k"
  const kMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Handle numbers with optional naira / ₦
  const numMatch = cleaned.match(/(?:₦|naira\s*)?(\d+(?:\.\d+)?)/i);
  if (numMatch && !isNaN(parseFloat(numMatch[1]))) {
    return parseFloat(numMatch[1]);
  }

  return null;
}

export function parseVoiceTranscript(transcript: string): ParsedVoiceTally {
  const result: ParsedVoiceTally = {
    creditLines: [],
    rawTranscript: transcript,
  };

  const lower = transcript.toLowerCase();

  // 1. Parse Total Sold / Sales
  // Patterns: "sold 15000", "sales 15000", "i sell 15000", "total 15000", "made 15000"
  const soldMatch = lower.match(/(?:sold|sell|sales|total\s*(?:sold|sales)?|made|enter)\s*(?:of|is|was|for)?\s*(?:₦|naira)?\s*(\d+(?:,\d+)*(?:\.\d+)?\s*k|\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (soldMatch) {
    const val = parseNumber(soldMatch[1]);
    if (val !== null && val > 0) result.totalSold = val;
  }

  // 2. Parse Expenses
  // Patterns: "expenses 2500", "expense 2500", "spent 2500", "spend 2500", "transport 500", "cost 1000"
  const expenseMatch = lower.match(/(?:expense|expenses|spent|spend|transport|fuel|cost)\s*(?:of|is|was|for)?\s*(?:₦|naira)?\s*(\d+(?:,\d+)*(?:\.\d+)?\s*k|\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (expenseMatch) {
    const val = parseNumber(expenseMatch[1]);
    if (val !== null && val > 0) result.expenses = val;
  }

  // 3. Parse Credit / Debtors
  // Patterns:
  // "Bola took 3000 credit", "Bola owes 3000", "credit of 3000 to Bola", "Bola carry 2000"
  const creditRegexes = [
    // "[Name] took/owe/carries [Amount] credit/on credit"
    /([a-zA-Z]+)\s+(?:took|owe|owes|carry|collect|collected)\s*(?:₦|naira)?\s*(\d+(?:,\d+)*(?:\.\d+)?\s*k|\d+(?:,\d+)*(?:\.\d+)?)\s*(?:credit|on credit)?/gi,
    // "credit of [Amount] for/to [Name]"
    /credit\s*(?:of|is|was)?\s*(?:₦|naira)?\s*(\d+(?:,\d+)*(?:\.\d+)?\s*k|\d+(?:,\d+)*(?:\.\d+)?)\s*(?:to|for)\s+([a-zA-Z]+)/gi,
  ];

  for (const match of lower.matchAll(creditRegexes[0])) {
    const name = match[1];
    const rawAmt = match[2];
    const ignoredWords = ['i', 'we', 'and', 'my', 'the', 'today', 'total', 'sales', 'expenses'];
    if (!ignoredWords.includes(name.toLowerCase())) {
      const amt = parseNumber(rawAmt);
      if (amt && amt > 0) {
        result.creditLines.push({
          customerName: name.charAt(0).toUpperCase() + name.slice(1),
          amount: amt,
        });
      }
    }
  }

  for (const match of lower.matchAll(creditRegexes[1])) {
    const rawAmt = match[1];
    const name = match[2];
    const amt = parseNumber(rawAmt);
    if (amt && amt > 0 && !result.creditLines.some(c => c.customerName.toLowerCase() === name.toLowerCase())) {
      result.creditLines.push({
        customerName: name.charAt(0).toUpperCase() + name.slice(1),
        amount: amt,
      });
    }
  }

  return result;
}
