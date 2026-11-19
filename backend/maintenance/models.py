from django.db import models
from django.db.models import Q

from .constants import AVAILABILITIES, CATEGORIES, PRIORITIES, STATUSES


def choices(values):
    return [(value, value) for value in values]


class Technician(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254, unique=True)
    specialization = models.CharField(max_length=120)
    availability = models.CharField(max_length=20, choices=choices(AVAILABILITIES), default="Available")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(availability__in=AVAILABILITIES),
                name="ck_technicians_availability",
            ),
        ]

    def __str__(self):
        return self.name


class MaintenanceRequest(models.Model):
    employee_name = models.CharField(max_length=120)
    employee_email = models.EmailField(max_length=254)
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=40, choices=choices(CATEGORIES), db_index=True)
    category_other = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=200)
    priority = models.CharField(max_length=10, choices=choices(PRIORITIES), db_index=True)
    status = models.CharField(max_length=20, choices=choices(STATUSES), default="Open")
    technician = models.ForeignKey(
        Technician,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="requests",
        db_index=True,
    )
    resolution_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status", "priority"], name="ix_requests_status_priority"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(category__in=CATEGORIES), name="ck_requests_category"),
            models.CheckConstraint(condition=Q(priority__in=PRIORITIES), name="ck_requests_priority"),
            models.CheckConstraint(condition=Q(status__in=STATUSES), name="ck_requests_status"),
            models.CheckConstraint(
                condition=~Q(status="Resolved") | Q(resolved_at__isnull=False),
                name="ck_requests_resolved_has_date",
            ),
            models.CheckConstraint(
                condition=~Q(category="Other") | (Q(category_other__isnull=False) & ~Q(category_other="")),
                name="ck_requests_other_category_text",
            ),
            models.CheckConstraint(
                condition=Q(category_other__isnull=True) | Q(category="Other"),
                name="ck_requests_category_other_only_for_other",
            ),
        ]

    def __str__(self):
        return f"#{self.pk} {self.title}"

    @property
    def technician_name(self):
        return self.technician.name if self.technician else None
