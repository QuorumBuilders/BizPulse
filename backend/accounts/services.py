import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import EmailVerification, UserProfile


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

    send_mail(
        subject="Verify your BizPulse email",
        message=(
            "Please verify your email address using this token:\n\n"
            f"{verification.token}\n\n"
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