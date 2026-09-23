from django.db import models
from django.core.validators import MinValueValidator


class DailyTally(models.Model):
    business = models.ForeignKey(
        "accounts.Business",
        on_delete=models.CASCADE,
        related_name="daily_tallies",
    )
    date = models.DateField()
    cash_sales = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    expenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    note = models.TextField(
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["business", "date"],
                name="unique_daily_tally_per_business_date",
            ),
        ]

    def __str__(self):
        return f"{self.business.name} - {self.date}"


class CreditRecord(models.Model):
    customer = models.ForeignKey(
        "finance.Customer",
        on_delete=models.CASCADE,
        related_name="credit_records",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
    )
    issued_date = models.DateField()
    due_date = models.DateField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.customer.name} - {self.amount}"


class Repayment(models.Model):
    credit_record = models.ForeignKey(
        "finance.CreditRecord",
        on_delete=models.CASCADE,
        related_name="repayments",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
    )
    paid_date = models.DateField()

    def __str__(self):
        return f"{self.credit_record.customer.name} - {self.amount}"
