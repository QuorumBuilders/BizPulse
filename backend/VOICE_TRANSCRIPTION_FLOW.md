# BizPulse Voice Transcription Flow

## Purpose

Voice input is an **input method**, not an automatic accounting mechanism.

The user speaks a financial entry, BizPulse transcribes and extracts the information, then the frontend presents the result for the user to review before anything is saved.

## Flow

```text
User speaks
    ↓
Frontend records audio
    ↓
POST /api/ai/transcribe/
    ↓
Backend transcribes audio
    ↓
Backend extracts structured information
    ↓
Structured proposal returned
    ↓
Frontend displays proposal
    ↓
User reviews / edits / confirms
    ↓
Normal BizPulse API creates the record
```

The voice endpoint **does not create or modify financial records**.

## Request

The frontend sends multipart form data:

```text
audio = recorded audio file
intent = optional
```

Supported explicit intents:

```text
daily_tally
credit_sale
repayment
```

If `intent` is omitted, the backend uses **General Entry** mode.

### General Entry

General Entry can identify multiple independent operations from one recording.

For example, a user could say that they made today's sales and that a customer repaid a debt.

The response can therefore contain multiple results.

### Explicit intent

When the user is already entering a specific type of record, the frontend should provide the corresponding intent.

For example:

```text
Daily Tally UI → intent=daily_tally
Credit Sale UI  → intent=credit_sale
Repayment UI    → intent=repayment
General Entry   → omit intent
```

This allows the backend to use a narrower extraction schema.

## Response

The response contains the structured information extracted from the speech.

The frontend should treat this as a **proposal**, not as trusted accounting data.

For example:

```json
{
    "data": {
        "date": null,
        "cash_sales": "80000",
        "expenses": "5000",
        "note": "Credit 2000"
    },
    "meta": {}
}
```

The frontend should display the extracted values and allow the user to review or edit them before submitting them through the normal BizPulse API.

## Important limitations

### 1. Transcription is not guaranteed to be perfect

Speech recognition can mishear words, numbers, names, or phrases.

The same recording can occasionally produce slightly different transcriptions.

Therefore, the user must review the proposed entry.

### 2. Currency is not determined by voice

The business's configured currency is authoritative.

The AI does not convert currencies or change the business currency based on something spoken in the recording.

Currency names/symbols should also not be treated as useful note content.

For example, an amount such as:

```text
5000
```

is interpreted using the Business's configured currency.

### 3. The AI does not identify customers

For a credit sale or repayment, the AI extracts the **customer name as spoken**.

It does not determine which database customer that name refers to.

The intended frontend flow is:

```text
Speech
  ↓
"Mr Ojo paid 20,000"
  ↓
AI extracts customer = "Mr Ojo"
  ↓
Frontend searches existing customers
  ↓
User selects existing customer
  OR
User creates a new customer
```

### 4. Missing information remains missing

The AI is instructed not to invent information.

If the user does not state a date, amount, customer, etc., the corresponding field can be `null`.

The frontend should handle incomplete proposals normally and allow the user to supply the missing information.

### 5. Voice does not bypass normal validation

After confirmation, the data goes through the same normal BizPulse API and domain validation as manually entered data.

The voice feature therefore does not get special permission to create invalid records.

## Supported language scope

The current practical scope is:

* English
* Nigerian Pidgin

Other languages may sometimes be transcribed successfully, but the frontend should **not promise reliable support for them** at this stage.

Yoruba and other Nigerian languages may be improved later.

## UX implication

Voice input should be presented as:

> **Speak → Review → Confirm**

not:

> **Speak → Automatically save**

The user remains responsible for confirming the financial entry before it is persisted.
