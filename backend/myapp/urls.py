from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    # Authentication
    path("api/auth/", include("accounts.auth_urls")),

    # Businesses
    path("api/businesses/", include("accounts.urls")),

    # Finance resources
    path("api/businesses/", include("finance.urls")),

    # AI resources
    path("api/ai/", include("ai.urls")),

    # OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"),name="swagger-ui"),
]