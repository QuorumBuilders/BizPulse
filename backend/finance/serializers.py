from rest_framework import serializers
from .models import DailyTally, CreditRecord, Repayment


class DailyTallySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTally
        fields = [
            "id",
            "date",
            "cash_sales",
            "expenses",
            "note",
        ]
        read_only_fields = [
            "id",
        ]

    def validate_note(self, value):
        return value.strip()


class CreditRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditRecord
        fields = [
            "id",
            "customer",
            "amount",
            "issued_date",
            "due_date",
        ]
        read_only_fields = [
            "id",
        ]

    def validate(self, attrs):
        issued_date = attrs.get("issued_date")
        due_date = attrs.get("due_date")

        if due_date is not None and due_date < issued_date:
            raise serializers.ValidationError(
                {
                    "due_date": (
                        "Due date cannot be earlier than the "
                        "issued date."
                    )
                }
            )

        return attrs


class RepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repayment
        fields = [
            "id",
            "credit_record",
            "amount",
            "paid_date",
        ]
        read_only_fields = [
            "id",
        ]

    def validate(self, attrs):
        credit_record = attrs["credit_record"]
        amount = attrs["amount"]
        paid_date = attrs["paid_date"]

        if paid_date < credit_record.issued_date:
            raise serializers.ValidationError(
                {
                    "paid_date": (
                        "Payment date cannot be earlier than "
                        "the credit issue date."
                    )
                }
            )

        total_repaid = sum(
            repayment.amount
            for repayment in credit_record.repayments.all()
        )

        outstanding = credit_record.amount - total_repaid

        if amount > outstanding:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Repayment cannot exceed the "
                        "outstanding amount."
                    )
                }
            )

        return attrs