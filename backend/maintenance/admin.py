from django.contrib import admin

from .models import MaintenanceRequest, Technician

admin.site.register(Technician)
admin.site.register(MaintenanceRequest)
