import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from .models import EmailVerification, UserProfile, PasswordResetToken


@transaction.atomic
def register_user(*, email, display_name, password):
    user = User.objects.create_user(
        username=uuid.uuid4().hex,
        email=email,
        password=password,
    )

    UserProfile.objects.create(
        user=user,
        display_name=display_name,
    )

    verification = EmailVerification.objects.create(
        user=user,
        email=email,
        purpose=EmailVerification.Purpose.SIGNUP,
        expires_at=timezone.now() + timedelta(hours=24),
    )
    verification_url = (
    f"{settings.FRONTEND_URL}/auth/verify_email"
    f"?token={verification.token}"
)

    send_mail(
        subject="Verify your BizPulse email",
        message=(
            "Please verify your email address using this token:\n\n"
            f"{verification_url}\n\n"
            "This verification token expires in 24 hours."
        ),
        from_email=None,
        recipient_list=[email],
    )

    return user




def verify_email(token):
    verification = EmailVerification.objects.filter(
        token=token,
        used_at__isnull=True,
    ).first()

    if verification is None:
        raise ValueError("Invalid or already used verification token.")

    if verification.expires_at <= timezone.now():
        raise ValueError("Verification token has expired.")

    with transaction.atomic():
        verification.used_at = timezone.now()
        verification.save(update_fields=["used_at"])

        profile = verification.user.profile

        if verification.purpose == EmailVerification.Purpose.SIGNUP:
            profile.email_verified = True
            profile.save(update_fields=["email_verified"])

        elif verification.purpose == EmailVerification.Purpose.EMAIL_CHANGE:
            verification.user.email = verification.email
            verification.user.save(update_fields=["email"])

            profile.email_verified = True
            profile.save(update_fields=["email_verified"])

    return verification




@transaction.atomic
def resend_verification_email(*, user):
    EmailVerification.objects.filter(
        user=user,
        purpose=EmailVerification.Purpose.SIGNUP,
        used_at__isnull=True,
    ).update(
        used_at=timezone.now(),
    )

    verification = EmailVerification.objects.create(
        user=user,
        email=user.email,
        purpose=EmailVerification.Purpose.SIGNUP,
        expires_at=timezone.now() + timedelta(hours=24),
    )

    verification_url = (
        f"{settings.FRONTEND_URL}/verify-email"
        f"?token={verification.token}"
    )

    send_mail(
        subject="Verify your BizPulse email",
        message=(
            "Please verify your BizPulse email address using the link below:\n\n"
            f"{verification_url}\n\n"
            "This verification link expires in 24 hours."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

    return verification


@transaction.atomic
def request_email_change(*, user, new_email):
    EmailVerification.objects.filter(
        user=user,
        purpose=EmailVerification.Purpose.EMAIL_CHANGE,
        used_at__isnull=True,
    ).update(
        used_at=timezone.now(),
    )

    verification = EmailVerification.objects.create(
        user=user,
        email=new_email,
        purpose=EmailVerification.Purpose.EMAIL_CHANGE,
        expires_at=timezone.now() + timedelta(hours=24),
    )

    verification_url = (
        f"{settings.FRONTEND_URL}/verify_email"
        f"?token={verification.token}"
    )

    send_mail(
        subject="Verify your new BizPulse email",
        message=(
            "You requested to change your BizPulse email address.\n\n"
            "Verify your new email address using the link below:\n\n"
            f"{verification_url}\n\n"
            "This verification link expires in 24 hours."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[new_email],
    )

    return verification


@transaction.atomic
def change_password(*, user, current_password, new_password):
    if not user.check_password(current_password):
        raise ValueError("The current password is incorrect.")

    validate_password(new_password, user)

    user.set_password(new_password)
    user.save(update_fields=["password"])

    outstanding_tokens = OutstandingToken.objects.filter(
        user=user,
    )

    for token in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(
            token=token,
        )

@transaction.atomic
def request_password_reset(*, email):
    user = (
        User.objects
        .filter(
            email__iexact=email,
            profile__email_verified=True,
        )
        .select_related("profile")
        .first()
    )

    if user is None:
        return

    PasswordResetToken.objects.filter(
        user=user,
        used_at__isnull=True,
    ).update(
        used_at=timezone.now(),
    )

    reset_token = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1),
    )

    reset_url = (
        f"{settings.FRONTEND_URL}/reset_password"
        f"?token={reset_token.token}"
    )

    send_mail(
        subject="Reset your BizPulse password",
        message=(
            "You requested a password reset for your BizPulse account.\n\n"
            "Reset your password using the link below:\n\n"
            f"{reset_url}\n\n"
            "This password reset link expires in 1 hour.\n\n"
            "If you did not request this, you can safely ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )

def reset_password(*, token, new_password):
    reset_token = (
        PasswordResetToken.objects
        .select_related("user")
        .filter(
            token=token,
            used_at__isnull=True,
        )
        .first()
    )

    if reset_token is None:
        raise ValueError(
            "Invalid or already used password reset token."
        )

    if reset_token.expires_at <= timezone.now():
        raise ValueError(
            "Password reset token has expired."
        )

    user = reset_token.user

    validate_password(new_password, user)

    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=["password"])

        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=["used_at"])

        outstanding_tokens = OutstandingToken.objects.filter(
            user=user,
        )

        for outstanding_token in outstanding_tokens:
            BlacklistedToken.objects.get_or_create(
                token=outstanding_token,
            )