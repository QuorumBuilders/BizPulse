from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status

from myapp.responses import (
    StandardListCreateAPIView,
    StandardRetrieveUpdateDestroyAPIView,
)
from rest_framework.response import Response

from .models import Business
from .serializers import BusinessSerializer, RegisterSerializer, VerifyEmailSerializer
from .services import register_user, verify_email

from rest_framework_simplejwt.views import TokenObtainPairView, TokenBlacklistView
from .serializers import EmailTokenObtainPairSerializer, LogoutSerializer



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


class LogoutView(TokenBlacklistView):
    serializer_class = LogoutSerializer
    permission_classes = [permissions.AllowAny]