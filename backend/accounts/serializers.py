from rest_framework import serializers

from .models import Customer, Business


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id",
            "name",
            "starting_cash",
            "deleted_at",
            "purge_at",
        ]
        read_only_fields = [
            "id",
            "deleted_at",
            "purge_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Business name cannot be empty."
            )

        return value

    def validate_starting_cash(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Starting cash cannot be negative."
            )

        return value

    def update(self, instance, validated_data):
        if "starting_cash" in validated_data:
            raise serializers.ValidationError(
                {
                    "starting_cash": (
                        "Starting cash cannot be changed through "
                        "normal business updates."
                    )
                }
            )

        return super().update(instance, validated_data)



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
