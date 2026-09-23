from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import permissions

from myapp.responses import (
    StandardListCreateAPIView,
    StandardRetrieveUpdateDestroyAPIView,
)
from rest_framework.exceptions import NotFound, ValidationError

from accounts.models import Business
from .models import Customer, DailyTally, CreditRecord, Repayment
from .serializers import (
    CustomerSerializer,
    DailyTallySerializer,
    CreditRecordSerializer,
    RepaymentSerializer,
)


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class CustomerListCreateView(StandardListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        return Customer.objects.filter(
            business=business,
        )

    def perform_create(self, serializer):
        business = self.get_business()
        serializer.save(business=business)


class CustomerDetailView(StandardRetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "customer_id"

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        return Customer.objects.filter(
            business=business,
        )


# ---------------------------------------------------------------------------
# Daily Tally
# ---------------------------------------------------------------------------

class DailyTallyListCreateView(StandardListCreateAPIView):
    serializer_class = DailyTallySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        queryset = DailyTally.objects.filter(
            business=business,
        )

        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")

        parsed_from_date = None
        parsed_to_date = None

        if from_date:
            try:
                parsed_from_date = date.fromisoformat(from_date)
            except ValueError:
                raise ValidationError(
                    {
                        "from_date": (
                            "Invalid date format. Use YYYY-MM-DD."
                        )
                    }
                )

            queryset = queryset.filter(
                date__gte=parsed_from_date,
            )

        if to_date:
            try:
                parsed_to_date = date.fromisoformat(to_date)
            except ValueError:
                raise ValidationError(
                    {
                        "to_date": (
                            "Invalid date format. Use YYYY-MM-DD."
                        )
                    }
                )

            queryset = queryset.filter(
                date__lte=parsed_to_date,
            )

        if (
            parsed_from_date
            and parsed_to_date
            and parsed_from_date > parsed_to_date
        ):
            raise ValidationError(
                {
                    "date_range": (
                        "from_date cannot be later than to_date."
                    )
                }
            )

        return queryset.order_by("-date")

    def perform_create(self, serializer):
        business = self.get_business()
        serializer.save(business=business)


class DailyTallyDetailView(StandardRetrieveUpdateDestroyAPIView):
    serializer_class = DailyTallySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "tally_id"

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        return DailyTally.objects.filter(
            business=business,
        )


# ---------------------------------------------------------------------------
# Credit Record
# ---------------------------------------------------------------------------

class CreditRecordListCreateView(StandardListCreateAPIView):
    serializer_class = CreditRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        return (
            CreditRecord.objects
            .filter(customer__business=business)
            .select_related("customer")
            .order_by("-issued_date", "-id")
        )

    def perform_create(self, serializer):
        business = self.get_business()
        customer = serializer.validated_data["customer"]

        if customer.business_id != business.id:
            raise NotFound("Customer not found.")

        serializer.save()


class CreditRecordDetailView(StandardRetrieveUpdateDestroyAPIView):
    serializer_class = CreditRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "credit_id"

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_queryset(self):
        business = self.get_business()

        return CreditRecord.objects.filter(
            customer__business=business,
        )


# ---------------------------------------------------------------------------
# Repayment
# ---------------------------------------------------------------------------

class RepaymentListCreateView(StandardListCreateAPIView):
    serializer_class = RepaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_credit_record(self):
        business = self.get_business()

        return get_object_or_404(
            CreditRecord.objects.filter(
                customer__business=business,
            ),
            pk=self.kwargs["credit_id"],
        )

    def get_queryset(self):
        credit_record = self.get_credit_record()

        return Repayment.objects.filter(
            credit_record=credit_record,
        ).order_by("-paid_date", "-id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["credit_record"] = self.get_credit_record()
        return context

    def perform_create(self, serializer):
        credit_record = self.get_credit_record()

        serializer.save(
            credit_record=credit_record,
        )


class RepaymentDetailView(StandardRetrieveUpdateDestroyAPIView):
    serializer_class = RepaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "repayment_id"

    def get_business(self):
        Business.purge_expired_for_user(self.request.user)

        return get_object_or_404(
            Business.objects.filter(
                user=self.request.user,
                deleted_at__isnull=True,
            ),
            pk=self.kwargs["business_id"],
        )

    def get_credit_record(self):
        business = self.get_business()

        return get_object_or_404(
            CreditRecord.objects.filter(
                customer__business=business,
            ),
            pk=self.kwargs["credit_id"],
        )

    def get_queryset(self):
        credit_record = self.get_credit_record()

        return Repayment.objects.filter(
            credit_record=credit_record,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["credit_record"] = self.get_credit_record()
        return context