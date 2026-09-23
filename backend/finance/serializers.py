from rest_framework import serializers
from .models import DailyTally, CreditRecord, Repayment, Customer


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
            "credit_record",
        ]

    def validate(self, attrs):
        credit_record = self.context.get("credit_record")

        if credit_record is None:
            raise serializers.ValidationError(
                "Credit record context is required."
            )

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
            if (
                self.instance is None
                or repayment.pk != self.instance.pk
            )
        )

        outstanding = credit_record.amount - total_repaid

        if attrs["amount"] > outstanding:
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Repayment cannot exceed the "
                        "outstanding amount."
                    )
                }
            )

        return attrs

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
        ]
        read_only_fields = [
            "id",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Customer name cannot be empty."
            )

        return value

    def validate_phone(self, value):
        return value.strip()
