from django.urls import path

from .views import (RegisterView, VerifyEmailView ,
                    EmailTokenObtainPairView, LogoutView,
                    ResendVerificationView, ChangeEmailView,
                    PasswordChangeView, PasswordResetRequestView,
                    PasswordResetConfirmView)
from rest_framework_simplejwt.views import TokenRefreshView



urlpatterns = [ 

    path("token/", EmailTokenObtainPairView.as_view(), name="token-obtain"),
    path("token/refresh/", TokenRefreshView.as_view(),name="token-refresh"),
    path("register/", RegisterView.as_view(),name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("verify-email/resend/", ResendVerificationView.as_view(), name="verify-email-resend"),
    path("email/change/", ChangeEmailView.as_view(), name="email-change"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]