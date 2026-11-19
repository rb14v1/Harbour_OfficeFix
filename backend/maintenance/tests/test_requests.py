from maintenance.models import MaintenanceRequest, Technician

from .helpers import ApiTestCase

REQUESTS = "/api/v1/requests"


class CreateRequestTests(ApiTestCase):
    def test_create_starts_open_and_unassigned(self):
        created = self.make_request()

        self.assertEqual(created["status"], "Open")
        self.assertIsNone(created["technician_id"])
        self.assertIsNone(created["technician_name"])
        self.assertIsNone(created["resolved_at"])

    def test_rejects_invalid_category_priority_and_email(self):
        base = {
            "employee_name": "Sam",
            "employee_email": "sam@example.com",
            "title": "Leak",
            "description": "Water under the sink",
            "category": "Plumbing",
            "location": "Floor 1",
            "priority": "High",
        }
        self.assertEqual(self.client.post(REQUESTS, {**base, "category": "Carpentry"}).status_code, 422)
        self.assertEqual(self.client.post(REQUESTS, {**base, "priority": "Urgent"}).status_code, 422)
        self.assertEqual(self.client.post(REQUESTS, {**base, "employee_email": "not-an-email"}).status_code, 422)

    def test_rejects_missing_or_blank_required_fields(self):
        response = self.client.post(
            REQUESTS, {"employee_name": "   ", "employee_email": "sam@example.com", "category": "Other"}
        )
        self.assertEqual(response.status_code, 422)

    def test_employee_name_rejects_special_characters(self):
        base = {
            "employee_email": "sam@example.com",
            "title": "Leak",
            "description": "Water under the sink",
            "category": "Plumbing",
            "location": "Floor 1",
            "priority": "High",
        }
        for bad_name in ["Sam<script>", "Sam 😀", "Sam9", "Sam;DROP", "Sam@home", "<b>Sam</b>"]:
            response = self.client.post(REQUESTS, {**base, "employee_name": bad_name})
            self.assertEqual(response.status_code, 422, bad_name)

    def test_employee_name_accepts_valid_names(self):
        for name in ["O'Brien", "Mary-Jane J.", "Zoë Ünal", "José García"]:
            self.assertEqual(self.make_request(employee_name=name)["employee_name"], name)

    def test_title_and_location_reject_markup_and_emoji(self):
        base = {
            "employee_name": "Sam",
            "employee_email": "sam@example.com",
            "description": "Water under the sink",
            "category": "Plumbing",
            "priority": "High",
        }
        self.assertEqual(self.client.post(REQUESTS, {**base, "title": "<b>Leak</b>", "location": "Floor 1"}).status_code, 422)
        self.assertEqual(self.client.post(REQUESTS, {**base, "title": "Leak 💧", "location": "Floor 1"}).status_code, 422)
        self.assertEqual(self.client.post(REQUESTS, {**base, "title": "Leak", "location": "Floor 1; drop"}).status_code, 422)

    def test_title_and_location_accept_common_punctuation(self):
        created = self.make_request(title="AC unit 2 (rear) - noisy & hot #4", location="Floor 3 - Room B/12")
        self.assertEqual(created["title"], "AC unit 2 (rear) - noisy & hot #4")
        self.assertEqual(created["location"], "Floor 3 - Room B/12")


class OtherCategoryTests(ApiTestCase):
    def test_other_requires_specification(self):
        base = {
            "employee_name": "Sam",
            "employee_email": "sam@example.com",
            "title": "Broken blinds",
            "description": "Cord snapped",
            "category": "Other",
            "location": "Floor 2",
            "priority": "Low",
        }
        missing = self.client.post(REQUESTS, base)
        blank = self.client.post(REQUESTS, {**base, "category_other": "   "})
        self.assertEqual(missing.status_code, 422)
        self.assertIn("Please specify the category", missing.content.decode())
        self.assertEqual(blank.status_code, 422)

    def test_other_text_is_stored(self):
        created = self.make_request(category="Other", category_other="Window blinds")
        self.assertEqual(created["category"], "Other")
        self.assertEqual(created["category_other"], "Window blinds")

    def test_text_is_cleared_for_fixed_categories(self):
        created = self.make_request(category="Plumbing", category_other="Should be ignored")
        self.assertIsNone(created["category_other"])

    def test_rejects_markup_and_long_text(self):
        base = {
            "employee_name": "Sam",
            "employee_email": "sam@example.com",
            "title": "Broken blinds",
            "description": "Cord snapped",
            "category": "Other",
            "location": "Floor 2",
            "priority": "Low",
        }
        self.assertEqual(self.client.post(REQUESTS, {**base, "category_other": "<b>Blinds</b>"}).status_code, 422)
        self.assertEqual(self.client.post(REQUESTS, {**base, "category_other": "x" * 101}).status_code, 422)

    def test_update_to_other_requires_text_and_leaving_other_clears_it(self):
        request = self.make_request(category="Electrical")
        url = f"{REQUESTS}/{request['id']}"

        no_text = self.client.patch(url, {"category": "Other"})
        with_text = self.client.patch(url, {"category": "Other", "category_other": "Smart plug"})
        self.assertEqual(no_text.status_code, 422)
        self.assertEqual(with_text.status_code, 200)
        self.assertEqual(with_text.json()["category_other"], "Smart plug")

        back = self.client.patch(url, {"category": "Plumbing"})
        self.assertEqual(back.status_code, 200)
        self.assertIsNone(back.json()["category_other"])

    def test_clearing_other_text_while_category_is_other_is_rejected(self):
        request = self.make_request(category="Other", category_other="Smart plug")
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"category_other": None})
        self.assertEqual(response.status_code, 422)


class ListAndGetRequestTests(ApiTestCase):
    def test_filters_by_status_category_and_priority(self):
        lamp = self.make_request(category="Electrical", priority="Low")
        self.make_request(category="Plumbing", priority="High")
        self.client.patch(f"{REQUESTS}/{lamp['id']}", {"status": "In Progress"})

        self.assertEqual(len(self.client.get(REQUESTS).json()), 2)
        self.assertEqual(
            [r["category"] for r in self.client.get(REQUESTS, {"category": "Plumbing"}).json()], ["Plumbing"]
        )
        self.assertEqual(
            [r["id"] for r in self.client.get(REQUESTS, {"status": "In Progress"}).json()], [lamp["id"]]
        )
        self.assertEqual(
            [r["priority"] for r in self.client.get(REQUESTS, {"priority": "High"}).json()], ["High"]
        )

    def test_rejects_invalid_filter_value(self):
        self.assertEqual(self.client.get(REQUESTS, {"status": "Closed"}).status_code, 422)

    def test_get_returns_404_when_missing(self):
        response = self.client.get(f"{REQUESTS}/999999")
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())


class AssignmentTests(ApiTestCase):
    def test_assign_available_technician_sets_name(self):
        technician = self.make_technician()
        request = self.make_request()
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": technician["id"]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["technician_id"], technician["id"])
        self.assertEqual(response.json()["technician_name"], technician["name"])

    def test_reassignment_returns_new_technician_name(self):
        first = self.make_technician(email="first@example.com", name="First Tech")
        second = self.make_technician(email="second@example.com", name="Second Tech")
        request = self.make_request()
        self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": first["id"]})
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": second["id"]})
        self.assertEqual(response.json()["technician_name"], "Second Tech")

    def test_cannot_assign_unavailable_technician(self):
        technician = self.make_technician(availability="Unavailable")
        request = self.make_request()
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": technician["id"]})
        self.assertEqual(response.status_code, 422)
        self.assertIn("unavailable", response.json()["detail"].lower())

    def test_assign_missing_technician_returns_404(self):
        request = self.make_request()
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": 999999})
        self.assertEqual(response.status_code, 404)

    def test_unavailable_technician_keeps_assignment_when_other_fields_change(self):
        technician = self.make_technician()
        request = self.make_request()
        self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": technician["id"]})
        self.client.patch(f"/api/v1/technicians/{technician['id']}", {"availability": "Unavailable"})

        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"location": "Floor 4"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["technician_id"], technician["id"])

    def test_unassign_with_null(self):
        technician = self.make_technician()
        request = self.make_request()
        self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": technician["id"]})

        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": None})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["technician_id"])
        self.assertIsNone(response.json()["technician_name"])

    def test_deleting_technician_row_unassigns_its_requests(self):
        technician = self.make_technician()
        request = self.make_request()
        self.client.patch(f"{REQUESTS}/{request['id']}", {"technician_id": technician["id"]})

        Technician.objects.filter(pk=technician["id"]).delete()

        self.assertIsNone(self.client.get(f"{REQUESTS}/{request['id']}").json()["technician_id"])


class UpdateRequestTests(ApiTestCase):
    def test_resolving_sets_resolved_at_and_notes_persist(self):
        request = self.make_request()
        response = self.client.patch(
            f"{REQUESTS}/{request['id']}",
            {"status": "Resolved", "resolution_notes": "Replaced ballast."},
        )
        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(body["status"], "Resolved")
        self.assertIsNotNone(body["resolved_at"])
        self.assertEqual(body["resolution_notes"], "Replaced ballast.")

    def test_reopening_clears_resolved_at(self):
        request = self.make_request()
        self.client.patch(f"{REQUESTS}/{request['id']}", {"status": "Resolved"})
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"status": "In Progress"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "In Progress")
        self.assertIsNone(response.json()["resolved_at"])

    def test_invalid_status_rejected(self):
        request = self.make_request()
        self.assertEqual(self.client.patch(f"{REQUESTS}/{request['id']}", {"status": "Closed"}).status_code, 422)

    def test_rejects_null_for_required_field(self):
        request = self.make_request()
        self.assertEqual(self.client.patch(f"{REQUESTS}/{request['id']}", {"title": None}).status_code, 422)

    def test_rejects_unknown_fields(self):
        request = self.make_request()
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"created_at": "2000-01-01T00:00:00Z"})
        self.assertEqual(response.status_code, 422)

    def test_update_missing_request_returns_404(self):
        self.assertEqual(self.client.patch(f"{REQUESTS}/999999", {"status": "Resolved"}).status_code, 404)

    def test_employee_name_rejects_special_characters_on_update(self):
        request = self.make_request()
        response = self.client.patch(f"{REQUESTS}/{request['id']}", {"employee_name": "Sam<script>"})
        self.assertEqual(response.status_code, 422)

    def test_title_and_location_rules_on_update(self):
        request = self.make_request()
        self.assertEqual(self.client.patch(f"{REQUESTS}/{request['id']}", {"title": "<b>x</b>"}).status_code, 422)
        self.assertEqual(self.client.patch(f"{REQUESTS}/{request['id']}", {"location": "Floor; 9"}).status_code, 422)


class DeleteRequestTests(ApiTestCase):
    def test_delete_then_not_found(self):
        request = self.make_request()
        self.assertEqual(self.client.delete(f"{REQUESTS}/{request['id']}").status_code, 204)
        self.assertEqual(self.client.get(f"{REQUESTS}/{request['id']}").status_code, 404)

    def test_delete_missing_returns_404(self):
        self.assertEqual(self.client.delete(f"{REQUESTS}/999999").status_code, 404)


class DatabaseConstraintTests(ApiTestCase):
    def test_database_rejects_resolved_without_date(self):
        from django.db import IntegrityError, transaction

        request = self.make_request()
        with self.assertRaises(IntegrityError), transaction.atomic():
            MaintenanceRequest.objects.filter(pk=request["id"]).update(status="Resolved", resolved_at=None)
