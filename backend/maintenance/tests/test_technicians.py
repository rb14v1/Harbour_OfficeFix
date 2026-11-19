from .helpers import ApiTestCase

TECHNICIANS = "/api/v1/technicians"


class CreateTechnicianTests(ApiTestCase):
    def test_normalises_email_and_starts_with_zero_load(self):
        technician = self.make_technician(email="Jamie.Ops@Example.com")
        self.assertEqual(technician["email"], "jamie.ops@example.com")
        self.assertEqual(technician["availability"], "Available")
        self.assertEqual(technician["active_request_count"], 0)

    def test_duplicate_email_returns_409(self):
        self.make_technician(email="dup@example.com")
        response = self.client.post(
            TECHNICIANS, {"name": "Other", "email": "DUP@example.com", "specialization": "Plumbing"}
        )
        self.assertEqual(response.status_code, 409)

    def test_rejects_invalid_availability_and_email(self):
        bad_availability = self.client.post(
            TECHNICIANS,
            {"name": "A", "email": "a@example.com", "specialization": "HVAC/AC", "availability": "Busy"},
        )
        bad_email = self.client.post(TECHNICIANS, {"name": "B", "email": "nope", "specialization": "HVAC/AC"})
        self.assertEqual(bad_availability.status_code, 422)
        self.assertEqual(bad_email.status_code, 422)

    def test_name_rejects_special_characters(self):
        for bad_name in ["Alex<b>", "Alex 2", "Alex 😀", "Alex;drop"]:
            response = self.client.post(
                TECHNICIANS,
                {"name": bad_name, "email": "alex@example.com", "specialization": "Electrical"},
            )
            self.assertEqual(response.status_code, 422, bad_name)

    def test_name_accepts_valid_names(self):
        created = self.make_technician(name="Anne-Marie O'Neill", email="anne@example.com")
        self.assertEqual(created["name"], "Anne-Marie O'Neill")

    def test_specialization_accepts_category_style_text(self):
        created = self.make_technician(email="spec@example.com", specialization="HVAC/AC & Internet/Network (Level 2)")
        self.assertEqual(created["specialization"], "HVAC/AC & Internet/Network (Level 2)")

    def test_specialization_rejects_markup_emoji_and_long_text(self):
        for bad in ["<b>Plumbing</b>", "Plumbing 🚰", "Plumbing;drop", "x" * 121]:
            response = self.client.post(
                TECHNICIANS,
                {"name": "Alex", "email": "spec2@example.com", "specialization": bad},
            )
            self.assertEqual(response.status_code, 422, bad)


class ListAndEditTechnicianTests(ApiTestCase):
    def test_list_counts_only_active_requests(self):
        technician = self.make_technician()
        active = self.make_request()
        finished = self.make_request()
        self.client.patch(f"/api/v1/requests/{active['id']}", {"technician_id": technician["id"]})
        self.client.patch(f"/api/v1/requests/{finished['id']}", {"technician_id": technician["id"]})
        self.client.patch(f"/api/v1/requests/{finished['id']}", {"status": "Resolved"})

        listed = self.client.get(TECHNICIANS).json()
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["active_request_count"], 1)

    def test_mark_unavailable(self):
        technician = self.make_technician()
        response = self.client.patch(f"{TECHNICIANS}/{technician['id']}", {"availability": "Unavailable"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["availability"], "Unavailable")

    def test_update_rejects_invalid_availability(self):
        technician = self.make_technician()
        self.assertEqual(self.client.patch(f"{TECHNICIANS}/{technician['id']}", {"availability": "Busy"}).status_code, 422)

    def test_update_rejects_null_name(self):
        technician = self.make_technician()
        self.assertEqual(self.client.patch(f"{TECHNICIANS}/{technician['id']}", {"name": None}).status_code, 422)

    def test_update_email_conflict_returns_409(self):
        self.make_technician(email="taken@example.com")
        other = self.make_technician(email="other@example.com", name="Other Tech")
        response = self.client.patch(f"{TECHNICIANS}/{other['id']}", {"email": "taken@example.com"})
        self.assertEqual(response.status_code, 409)

    def test_update_specialization_rejects_markup(self):
        technician = self.make_technician(email="spec3@example.com")
        response = self.client.patch(f"{TECHNICIANS}/{technician['id']}", {"specialization": "<script>"})
        self.assertEqual(response.status_code, 422)

    def test_update_name_rejects_special_characters(self):
        technician = self.make_technician()
        response = self.client.patch(f"{TECHNICIANS}/{technician['id']}", {"name": "Alex<script>"})
        self.assertEqual(response.status_code, 422)

    def test_get_returns_404_when_missing(self):
        self.assertEqual(self.client.get(f"{TECHNICIANS}/999999").status_code, 404)

    def test_update_returns_404_when_missing(self):
        self.assertEqual(self.client.patch(f"{TECHNICIANS}/999999", {"availability": "Unavailable"}).status_code, 404)
