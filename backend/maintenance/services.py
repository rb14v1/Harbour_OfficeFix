from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import NotFound

from .exceptions import BusinessRuleError, ConflictError
from .models import MaintenanceRequest, Technician

NON_TECHNICIAN_ACTIVE = ~Q(requests__status="Resolved")


# Maintenance requests

def list_requests(status=None, category=None, priority=None):
    queryset = MaintenanceRequest.objects.select_related("technician")
    if status:
        queryset = queryset.filter(status=status)
    if category:
        queryset = queryset.filter(category=category)
    if priority:
        queryset = queryset.filter(priority=priority)
    return queryset.order_by("-created_at", "-id")


def get_request(request_id):
    try:
        return MaintenanceRequest.objects.select_related("technician").get(pk=request_id)
    except MaintenanceRequest.DoesNotExist:
        raise NotFound(f"Maintenance request {request_id} was not found.")


def create_request(data):
    return MaintenanceRequest.objects.create(status="Open", **data)


def _assert_assignable(technician_id):
    technician = Technician.objects.filter(pk=technician_id).first()
    if technician is None:
        raise NotFound(f"Technician {technician_id} was not found.")
    if technician.availability != "Available":
        raise BusinessRuleError(
            f"Technician {technician.name} is unavailable and cannot be assigned new requests."
        )


def update_request(request_id, changes):
    request = get_request(request_id)

    if "technician_id" in changes:
        new_technician_id = changes.pop("technician_id")
        if new_technician_id is None:
            request.technician = None
        elif new_technician_id != request.technician_id:
            _assert_assignable(new_technician_id)
            request.technician_id = new_technician_id

    if "status" in changes:
        if changes["status"] == "Resolved":
            if request.resolved_at is None:
                request.resolved_at = timezone.now()
        else:
            request.resolved_at = None

    effective_category = changes.get("category", request.category)
    if effective_category == "Other":
        text = changes["category_other"] if "category_other" in changes else request.category_other
        if not text or not text.strip():
            raise BusinessRuleError("Please specify the category when 'Other' is selected.")
        changes["category_other"] = text.strip()
    else:
        changes["category_other"] = None

    if "resolution_notes" in changes:
        notes = changes["resolution_notes"]
        changes["resolution_notes"] = notes.strip() if notes and notes.strip() else None

    for field, value in changes.items():
        setattr(request, field, value)

    with transaction.atomic():
        request.save()
    return get_request(request_id)


def delete_request(request_id):
    get_request(request_id).delete()


# Technicians

def _annotated_technicians():
    return Technician.objects.annotate(active_request_count=Count("requests", filter=NON_TECHNICIAN_ACTIVE))


def list_technicians():
    return _annotated_technicians().order_by("name", "id")


def get_technician(technician_id):
    technician = _annotated_technicians().filter(pk=technician_id).first()
    if technician is None:
        raise NotFound(f"Technician {technician_id} was not found.")
    return technician


def _email_taken(email, exclude_id=None):
    queryset = Technician.objects.filter(email__iexact=email)
    if exclude_id is not None:
        queryset = queryset.exclude(pk=exclude_id)
    return queryset.exists()


def create_technician(data):
    email = data["email"].lower()
    if _email_taken(email):
        raise ConflictError("A technician with this email already exists.")
    try:
        with transaction.atomic():
            technician = Technician.objects.create(**{**data, "email": email})
    except IntegrityError:
        raise ConflictError("A technician with this email already exists.")
    return get_technician(technician.pk)


def update_technician(technician_id, changes):
    technician = Technician.objects.filter(pk=technician_id).first()
    if technician is None:
        raise NotFound(f"Technician {technician_id} was not found.")
    if "email" in changes:
        changes["email"] = changes["email"].lower()
        if _email_taken(changes["email"], exclude_id=technician_id):
            raise ConflictError("A technician with this email already exists.")
    for field, value in changes.items():
        setattr(technician, field, value)
    try:
        with transaction.atomic():
            technician.save()
    except IntegrityError:
        raise ConflictError("A technician with this email already exists.")
    return get_technician(technician_id)


# Dashboard

def dashboard_stats(recent_limit=5):
    request_totals = MaintenanceRequest.objects.aggregate(
        total_requests=Count("id"),
        open_requests=Count("id", filter=Q(status="Open")),
        in_progress_requests=Count("id", filter=Q(status="In Progress")),
        resolved_requests=Count("id", filter=Q(status="Resolved")),
        high_priority_unresolved=Count("id", filter=Q(priority="High") & ~Q(status="Resolved")),
    )
    technician_totals = Technician.objects.aggregate(
        total_technicians=Count("id"),
        available_technicians=Count("id", filter=Q(availability="Available")),
    )
    recent = list(list_requests()[:recent_limit])
    workload = list(
        Technician.objects.annotate(active_requests=Count("requests", filter=NON_TECHNICIAN_ACTIVE))
        .order_by("name", "id")
        .values("id", "name", "availability", "active_requests")
    )
    return {
        **request_totals,
        **technician_totals,
        "recent_requests": recent,
        "technician_workload": [
            {
                "technician_id": row["id"],
                "name": row["name"],
                "availability": row["availability"],
                "active_requests": row["active_requests"],
            }
            for row in workload
        ],
    }
