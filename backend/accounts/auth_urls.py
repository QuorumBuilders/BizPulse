from django.urls import path

from .views import RegisterView, VerifyEmailView ,EmailTokenObtainPairView, LogoutView
from rest_framework_simplejwt.views import TokenRefreshView



urlpatterns = [ 

    path("token/", EmailTokenObtainPairView.as_view(), name="token-obtain"),
    path("token/refresh/", TokenRefreshView.as_view(),name="token-refresh"),
    path("register/", RegisterView.as_view(),name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("logout/", LogoutView.as_view(), name="logout"),
]