from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .constants import CATEGORIES, PRIORITIES, STATUSES
from .serializers import (
    DashboardStatsSerializer,
    RequestCreateSerializer,
    RequestReadSerializer,
    RequestUpdateSerializer,
    TechnicianCreateSerializer,
    TechnicianReadSerializer,
    TechnicianUpdateSerializer,
)


class RequestListCreateView(APIView):
    @extend_schema(operation_id="requests_list", responses=RequestReadSerializer(many=True))
    def get(self, request):
        filters = {}
        errors = {}
        for name, allowed in (("status", STATUSES), ("category", CATEGORIES), ("priority", PRIORITIES)):
            value = request.query_params.get(name)
            if not value:
                continue
            if value not in allowed:
                errors[name] = [f'"{value}" is not a valid choice.']
            else:
                filters[name] = value
        if errors:
            raise ValidationError(errors)
        rows = services.list_requests(**filters)
        return Response(RequestReadSerializer(rows, many=True).data)

    @extend_schema(operation_id="requests_create", request=RequestCreateSerializer, responses={201: RequestReadSerializer})
    def post(self, request):
        serializer = RequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = services.create_request(serializer.validated_data)
        return Response(RequestReadSerializer(created).data, status=status.HTTP_201_CREATED)


class RequestDetailView(APIView):
    @extend_schema(operation_id="requests_retrieve", responses=RequestReadSerializer)
    def get(self, request, request_id):
        return Response(RequestReadSerializer(services.get_request(request_id)).data)

    @extend_schema(operation_id="requests_update", request=RequestUpdateSerializer, responses=RequestReadSerializer)
    def patch(self, request, request_id):
        serializer = RequestUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = services.update_request(request_id, dict(serializer.validated_data))
        return Response(RequestReadSerializer(updated).data)

    @extend_schema(operation_id="requests_delete", responses={204: None})
    def delete(self, request, request_id):
        services.delete_request(request_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TechnicianListCreateView(APIView):
    @extend_schema(operation_id="technicians_list", responses=TechnicianReadSerializer(many=True))
    def get(self, request):
        return Response(TechnicianReadSerializer(services.list_technicians(), many=True).data)

    @extend_schema(operation_id="technicians_create", request=TechnicianCreateSerializer, responses={201: TechnicianReadSerializer})
    def post(self, request):
        serializer = TechnicianCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        created = services.create_technician(dict(serializer.validated_data))
        return Response(TechnicianReadSerializer(created).data, status=status.HTTP_201_CREATED)


class TechnicianDetailView(APIView):
    @extend_schema(operation_id="technicians_retrieve", responses=TechnicianReadSerializer)
    def get(self, request, technician_id):
        return Response(TechnicianReadSerializer(services.get_technician(technician_id)).data)

    @extend_schema(operation_id="technicians_update", request=TechnicianUpdateSerializer, responses=TechnicianReadSerializer)
    def patch(self, request, technician_id):
        serializer = TechnicianUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = services.update_technician(technician_id, dict(serializer.validated_data))
        return Response(TechnicianReadSerializer(updated).data)


class DashboardStatsView(APIView):
    @extend_schema(operation_id="dashboard_stats", responses=DashboardStatsSerializer)
    def get(self, request):
        return Response(DashboardStatsSerializer(services.dashboard_stats()).data)
