EXTRACTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "intent": {
                        "type": "string",
                        "enum": [
                            "daily_tally",
                            "credit_sale",
                            "repayment",
                            "none",
                        ],
                    },
                    "data": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "date": {"type": ["string", "null"]},
                            "cash_sales": {"type": ["string", "null"]},
                            "expenses": {"type": ["string", "null"]},
                            "note": {"type": ["string", "null"]},
                            "customer": {"type": ["string", "null"]},
                            "amount": {"type": ["string", "null"]},
                            "issued_date": {"type": ["string", "null"]},
                            "due_date": {"type": ["string", "null"]},
                            "paid_date": {"type": ["string", "null"]},
                        },
                        "required": [
                            "date",
                            "cash_sales",
                            "expenses",
                            "note",
                            "customer",
                            "amount",
                            "issued_date",
                            "due_date",
                            "paid_date",
                        ],
                    },
                },
                "required": [
                    "intent",
                    "data",
                ],
            },
        },
    },
    "required": [
        "results",
    ],
}


DAILY_TALLY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "date": {
            "type": ["string", "null"],
        },
        "cash_sales": {
            "type": ["string", "null"],
        },
        "expenses": {
            "type": ["string", "null"],
        },
        "note": {
            "type": ["string", "null"],
        },
    },
    "required": [
        "date",
        "cash_sales",
        "expenses",
        "note",
    ],
}


CREDIT_SALE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "customer": {
            "type": ["string", "null"],
        },
        "amount": {
            "type": ["string", "null"],
        },
        "issued_date": {
            "type": ["string", "null"],
        },
        "due_date": {
            "type": ["string", "null"],
        },
    },
    "required": [
        "customer",
        "amount",
        "issued_date",
        "due_date",
    ],
}


REPAYMENT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "customer": {
            "type": ["string", "null"],
        },
        "amount": {
            "type": ["string", "null"],
        },
        "paid_date": {
            "type": ["string", "null"],
        },
    },
    "required": [
        "customer",
        "amount",
        "paid_date",
    ],
}