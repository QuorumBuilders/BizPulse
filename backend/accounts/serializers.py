from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Business

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenBlacklistSerializer



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



class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    display_name = serializers.CharField(max_length=150)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirmation = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate_display_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Display name cannot be empty."
            )

        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {
                    "password_confirmation": (
                        "Passwords do not match."
                    )
                }
            )

        return attrs

    
class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()

class ChangeEmailSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        return value.strip().lower()



class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        user = User.objects.filter(email__iexact=email).first()

        if user is None or not user.check_password(password):
            raise AuthenticationFailed(
                "No active account found with the given credentials."
            )

        if not user.profile.email_verified:
            raise AuthenticationFailed(
                "Please verify your email before logging in."
            )

        refresh = self.get_token(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class LogoutSerializer(TokenBlacklistSerializer):
    pass

class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirmation = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {
                    "password_confirmation": "Passwords do not match."
                }
            )

        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "New password must be different from the current password."
                    )
                }
            )

        return attrs
    

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirmation = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {
                    "password_confirmation": "Passwords do not match."
                }
            )

        return attrs