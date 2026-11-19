import logging

from django.db import DatabaseError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    if isinstance(exc, DatabaseError):
        logger.exception("Unhandled database error", exc_info=exc)
        return Response({"detail": "A database error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, ValidationError):
        # Validation failures return 422 (not 400), matching the API contract used by the frontend.
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    return response
