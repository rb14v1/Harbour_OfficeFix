from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .constants import AVAILABILITIES, CATEGORIES, PRIORITIES, STATUSES
from .models import MaintenanceRequest, Technician
from .validators import EMAIL_VALIDATOR, NAME_VALIDATOR, TEXT_VALIDATOR


def _reject_unknown_fields(initial_data, allowed):
    unknown = set(initial_data.keys()) - set(allowed)
    if unknown:
        raise ValidationError({field: ["Unknown field."] for field in sorted(unknown)})


class RequestReadSerializer(serializers.ModelSerializer):
    technician_id = serializers.IntegerField(read_only=True)
    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id", "employee_name", "employee_email", "title", "description", "category", "category_other",
            "location", "priority", "status", "technician_id", "technician_name", "resolution_notes",
            "created_at", "updated_at", "resolved_at",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_technician_name(self, obj):
        return obj.technician_name


class RequestCreateSerializer(serializers.Serializer):
    employee_name = serializers.CharField(max_length=120, validators=[NAME_VALIDATOR])
    employee_email = serializers.CharField(max_length=254, validators=[EMAIL_VALIDATOR])
    title = serializers.CharField(max_length=200, validators=[TEXT_VALIDATOR])
    description = serializers.CharField(max_length=5000)
    category = serializers.ChoiceField(choices=CATEGORIES)
    category_other = serializers.CharField(
        max_length=100, required=False, allow_null=True, validators=[TEXT_VALIDATOR]
    )
    location = serializers.CharField(max_length=200, validators=[TEXT_VALIDATOR])
    priority = serializers.ChoiceField(choices=PRIORITIES)

    def validate(self, attrs):
        if attrs["category"] == "Other":
            text = (attrs.get("category_other") or "").strip()
            if not text:
                raise ValidationError(
                    {"category_other": ["Please specify the category when 'Other' is selected."]}
                )
            attrs["category_other"] = text
        else:
            attrs["category_other"] = None
        return attrs


class RequestUpdateSerializer(serializers.Serializer):
    employee_name = serializers.CharField(max_length=120, validators=[NAME_VALIDATOR], required=False)
    employee_email = serializers.CharField(max_length=254, validators=[EMAIL_VALIDATOR], required=False)
    title = serializers.CharField(max_length=200, validators=[TEXT_VALIDATOR], required=False)
    description = serializers.CharField(max_length=5000, required=False)
    category = serializers.ChoiceField(choices=CATEGORIES, required=False)
    category_other = serializers.CharField(
        max_length=100, required=False, allow_null=True, validators=[TEXT_VALIDATOR]
    )
    location = serializers.CharField(max_length=200, validators=[TEXT_VALIDATOR], required=False)
    priority = serializers.ChoiceField(choices=PRIORITIES, required=False)
    status = serializers.ChoiceField(choices=STATUSES, required=False)
    technician_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    resolution_notes = serializers.CharField(
        max_length=5000, required=False, allow_null=True, allow_blank=True
    )

    def validate(self, attrs):
        _reject_unknown_fields(self.initial_data, self.fields.keys())
        return attrs


class TechnicianReadSerializer(serializers.ModelSerializer):
    active_request_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Technician
        fields = ["id", "name", "email", "specialization", "availability", "created_at", "active_request_count"]


class TechnicianCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, validators=[NAME_VALIDATOR])
    email = serializers.CharField(max_length=254, validators=[EMAIL_VALIDATOR])
    specialization = serializers.CharField(max_length=120, validators=[TEXT_VALIDATOR])
    availability = serializers.ChoiceField(choices=AVAILABILITIES, default="Available")


class TechnicianUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, validators=[NAME_VALIDATOR], required=False)
    email = serializers.CharField(max_length=254, validators=[EMAIL_VALIDATOR], required=False)
    specialization = serializers.CharField(max_length=120, validators=[TEXT_VALIDATOR], required=False)
    availability = serializers.ChoiceField(choices=AVAILABILITIES, required=False)

    def validate(self, attrs):
        _reject_unknown_fields(self.initial_data, self.fields.keys())
        return attrs


class DashboardWorkloadSerializer(serializers.Serializer):
    technician_id = serializers.IntegerField()
    name = serializers.CharField()
    availability = serializers.CharField()
    active_requests = serializers.IntegerField()


class DashboardStatsSerializer(serializers.Serializer):
    total_requests = serializers.IntegerField()
    open_requests = serializers.IntegerField()
    in_progress_requests = serializers.IntegerField()
    resolved_requests = serializers.IntegerField()
    high_priority_unresolved = serializers.IntegerField()
    total_technicians = serializers.IntegerField()
    available_technicians = serializers.IntegerField()
    recent_requests = RequestReadSerializer(many=True)
    technician_workload = DashboardWorkloadSerializer(many=True)
