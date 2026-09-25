from datetime import timedelta

from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import generics, permissions, status

from myapp.responses import (
    StandardListCreateAPIView,
    StandardRetrieveUpdateDestroyAPIView,
)
from rest_framework.response import Response

from .models import Business
from .serializers import (BusinessSerializer, RegisterSerializer,
                            VerifyEmailSerializer, ResendVerificationSerializer,
                            ChangeEmailSerializer, PasswordChangeSerializer, 
                            PasswordResetRequestSerializer, PasswordResetConfirmSerializer)
from .services import (register_user, verify_email,
                        resend_verification_email, request_email_change, 
                        change_password, request_password_reset, reset_password)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenBlacklistView
from .serializers import EmailTokenObtainPairSerializer, LogoutSerializer

from django.contrib.auth.models import User



class BusinessListCreateView(StandardListCreateAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        Business.purge_expired_for_user(self.request.user)

        return Business.objects.filter(
            user=self.request.user,
            deleted_at__isnull=True,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BusinessDetailView(StandardRetrieveUpdateDestroyAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        Business.purge_expired_for_user(self.request.user)

        return Business.objects.filter(
            user=self.request.user,
            deleted_at__isnull=True,
        )

    def perform_destroy(self, instance):
        now = timezone.now()

        instance.deleted_at = now
        instance.purge_at = now + timedelta(days=30)

        instance.save(
            update_fields=["deleted_at", "purge_at"]
        )


class BusinessRestoreView(generics.GenericAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Business.purge_expired_for_user(request.user)

        business = Business.objects.filter(
            id=kwargs["business_id"],
            user=request.user,
            deleted_at__isnull=False,
        ).first()

        if business is None:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Business not found.",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        business.deleted_at = None
        business.purge_at = None

        business.save(
            update_fields=["deleted_at", "purge_at"]
        )

        serializer = self.get_serializer(business)

        return Response(
            {
                "data": serializer.data,
                "meta": {},
            }
        )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        register_user(
            email=serializer.validated_data["email"],
            display_name=serializer.validated_data["display_name"],
            password=serializer.validated_data["password"],
        )

        return Response(
            {
                "data": {
                    "message": (
                        "Account created. "
                        "Please verify your email address."
                    )
                },
                "meta": {},
            },
            status=status.HTTP_201_CREATED,
        )



class VerifyEmailView(generics.GenericAPIView):
    serializer_class = VerifyEmailSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verify_email(
                serializer.validated_data["token"]
            )
        except ValueError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_VERIFICATION_TOKEN",
                        "message": str(exc),
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "data": {
                    "message": "Email verified successfully."
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_scope = "login"


class LogoutView(TokenBlacklistView):
    serializer_class = LogoutSerializer
    permission_classes = [permissions.AllowAny]



class ResendVerificationView(generics.GenericAPIView):
    serializer_class = ResendVerificationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "verification_resend"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user = User.objects.filter(
            email__iexact=email,
        ).select_related("profile").first()

        if user is not None and not user.profile.email_verified:
            resend_verification_email(user=user)

        return Response(
            {
                "data": {
                    "message": (
                        "If an unverified account exists for this email, "
                        "a verification email has been sent."
                    )
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )


class ChangeEmailView(generics.GenericAPIView):
    serializer_class = ChangeEmailSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "email_change"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data["current_password"]
        new_email = serializer.validated_data["new_email"]

        if not request.user.check_password(current_password):
            return Response(
                {
                    "error": {
                        "code": "INVALID_PASSWORD",
                        "message": "The current password is incorrect.",
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(
            email__iexact=new_email,
        ).exclude(
            pk=request.user.pk,
        ).exists():
            return Response(
                {
                    "error": {
                        "code": "EMAIL_ALREADY_IN_USE",
                        "message": "An account with this email already exists.",
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_email_change(
            user=request.user,
            new_email=new_email,
        )

        return Response(
            {
                "data": {
                    "message": (
                        "A verification email has been sent to your new email address."
                    )
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )
    

class PasswordChangeView(generics.GenericAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            change_password(
                user=request.user,
                current_password=serializer.validated_data["current_password"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_PASSWORD",
                        "message": str(exc),
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ValidationError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_PASSWORD",
                        "message": "The new password does not meet the password requirements.",
                        "details": {
                            "password": exc.messages,
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "data": {
                    "message": "Password changed successfully."
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_password_reset(
            email=serializer.validated_data["email"],
        )

        return Response(
            {
                "data": {
                    "message": (
                        "If an account exists with this email, "
                        "a password reset link has been sent."
                    )
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )
    

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_password(
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_PASSWORD_RESET_TOKEN",
                        "message": str(exc),
                        "details": {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValidationError as exc:
            return Response(
                {
                    "error": {
                        "code": "INVALID_PASSWORD",
                        "message": (
                            "The new password does not meet "
                            "the password requirements."
                        ),
                        "details": {
                            "password": exc.messages,
                        },
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "data": {
                    "message": "Password reset successfully."
                },
                "meta": {},
            },
            status=status.HTTP_200_OK,
        )