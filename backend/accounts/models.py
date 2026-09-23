from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Business(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="businesses",
    )
    name = models.CharField(max_length=150)
    starting_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    deleted_at = models.DateTimeField(null=True, blank=True)
    purge_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

    @classmethod
    def purge_expired_for_user(cls, user):
        cls.objects.filter(
            user=user,
            deleted_at__isnull=False,
            purge_at__lte=timezone.now(),
        ).delete()
    
