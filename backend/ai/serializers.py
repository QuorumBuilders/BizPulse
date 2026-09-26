from rest_framework import serializers


class TranscriptionSerializer(serializers.Serializer):
    audio = serializers.FileField()
    intent = serializers.ChoiceField(
        choices=[
            "daily_tally",
            "credit_sale",
            "repayment",
        ],
        required=False,
        allow_null=True,
    )