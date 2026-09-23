from django.urls import path

from .views import (
    CustomerListCreateView,
    CustomerDetailView,
    DailyTallyListCreateView,
    DailyTallyDetailView,
    CreditRecordListCreateView,
    CreditRecordDetailView,
    RepaymentListCreateView,
    RepaymentDetailView,
)


urlpatterns = [
    # Customers
    path(
        "<int:business_id>/customers/",
        CustomerListCreateView.as_view(),
        name="customer-list-create",
    ),
    path(
        "<int:business_id>/customers/<int:customer_id>/",
        CustomerDetailView.as_view(),
        name="customer-detail",
    ),

    # Daily tallies
    path(
        "<int:business_id>/daily-tallies/",
        DailyTallyListCreateView.as_view(),
        name="daily-tally-list-create",
    ),
    path(
        "<int:business_id>/daily-tallies/<int:tally_id>/",
        DailyTallyDetailView.as_view(),
        name="daily-tally-detail",
    ),

    # Credit records
    path(
        "<int:business_id>/credits/",
        CreditRecordListCreateView.as_view(),
        name="credit-list-create",
    ),
    path(
        "<int:business_id>/credits/<int:credit_id>/",
        CreditRecordDetailView.as_view(),
        name="credit-detail",
    ),

    # Repayments
    path(
        "<int:business_id>/credits/<int:credit_id>/repayments/",
        RepaymentListCreateView.as_view(),
        name="repayment-list-create",
    ),
    path(
        "<int:business_id>/credits/<int:credit_id>/repayments/<int:repayment_id>/",
        RepaymentDetailView.as_view(),
        name="repayment-detail",
    ),
]