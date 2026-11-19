from rest_framework.test import APITestCase


class ApiTestCase(APITestCase):
    def make_technician(self, **overrides):
        payload = {
            "name": "Alex Tech",
            "email": "alex.tech@example.com",
            "specialization": "Electrical",
            "availability": "Available",
        }
        payload.update(overrides)
        response = self.client.post("/api/v1/technicians", payload)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def make_request(self, **overrides):
        payload = {
            "employee_name": "Sam Employee",
            "employee_email": "sam@example.com",
            "title": "Desk lamp flickering",
            "description": "The lamp flickers when switched on.",
            "category": "Electrical",
            "location": "Floor 3, Desk 12",
            "priority": "Medium",
        }
        payload.update(overrides)
        response = self.client.post("/api/v1/requests", payload)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()
