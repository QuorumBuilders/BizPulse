from groq import Groq
import json
from .schemas import (EXTRACTION_SCHEMA, DAILY_TALLY_SCHEMA,
                      CREDIT_SALE_SCHEMA, REPAYMENT_SCHEMA)
from .prompts import (EXTRACTION_PROMPT, DAILY_TALLY_PROMPT,
                      CREDIT_SALE_PROMPT, REPAYMENT_PROMPT)



client = Groq()


def transcribe_audio(audio_file):
    transcription = client.audio.transcriptions.create(
        file=(audio_file.name, audio_file.read()),
        model="whisper-large-v3-turbo",
        response_format="verbose_json",
        temperature=0,
    )

    return {
        "text": transcription.text,
        "language": transcription.language,
    }



def route_extraction(transcript, intent=None):
    EXTRACTORS = {
    "daily_tally": extract_daily_tally,
    "credit_sale": extract_credit_sale,
    "repayment": extract_repayment,
}
    if intent is None:
        return extract_financial_data(transcript)

    extractor = EXTRACTORS.get(intent)

    if extractor is None:
        raise ValueError(f"Unsupported intent: {intent}")

    return extractor(transcript)


def extract_financial_data(transcript):
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": EXTRACTION_PROMPT,
            },
            {
                "role": "user",
                "content": transcript,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "bizpulse_extraction",
                "strict": True,
                "schema": EXTRACTION_SCHEMA,
            },
        },
    )

    raw_result = json.loads(response.choices[0].message.content)

    return raw_result

def extract_daily_tally(transcript):
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": DAILY_TALLY_PROMPT,
            },
            {
                "role": "user",
                "content": transcript,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "bizpulse_daily_tally",
                "strict": True,
                "schema": DAILY_TALLY_SCHEMA,
            },
        },
    )

    return json.loads(response.choices[0].message.content)


def extract_credit_sale(transcript):
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": CREDIT_SALE_PROMPT,
            },
            {
                "role": "user",
                "content": transcript,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "bizpulse_credit_sale",
                "strict": True,
                "schema": CREDIT_SALE_SCHEMA,
            },
        },
    )

    return json.loads(response.choices[0].message.content)



def extract_repayment(transcript):
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": REPAYMENT_PROMPT,
            },
            {
                "role": "user",
                "content": transcript,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "bizpulse_repayment",
                "strict": True,
                "schema": REPAYMENT_SCHEMA,
            },
        },
    )

    return json.loads(response.choices[0].message.content)