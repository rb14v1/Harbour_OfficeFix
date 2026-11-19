from .helpers import ApiTestCase

STATS = "/api/v1/dashboard/stats"


class DashboardTests(ApiTestCase):
    def test_zero_on_empty_database(self):
        stats = self.client.get(STATS).json()
        self.assertEqual(stats["total_requests"], 0)
        self.assertEqual(stats["open_requests"], 0)
        self.assertEqual(stats["in_progress_requests"], 0)
        self.assertEqual(stats["resolved_requests"], 0)
        self.assertEqual(stats["high_priority_unresolved"], 0)
        self.assertEqual(stats["total_technicians"], 0)
        self.assertEqual(stats["available_technicians"], 0)
        self.assertEqual(stats["recent_requests"], [])
        self.assertEqual(stats["technician_workload"], [])

    def test_counts_reflect_stored_status_and_priority(self):
        self.make_request(priority="Low")
        in_progress_high = self.make_request(priority="High")
        resolved_high = self.make_request(priority="High")
        self.client.patch(f"/api/v1/requests/{in_progress_high['id']}", {"status": "In Progress"})
        self.client.patch(f"/api/v1/requests/{resolved_high['id']}", {"status": "Resolved"})

        stats = self.client.get(STATS).json()
        self.assertEqual(stats["total_requests"], 3)
        self.assertEqual(stats["open_requests"], 1)
        self.assertEqual(stats["in_progress_requests"], 1)
        self.assertEqual(stats["resolved_requests"], 1)
        self.assertEqual(stats["high_priority_unresolved"], 1)

    def test_counts_update_after_changes(self):
        request = self.make_request(priority="High")
        self.assertEqual(self.client.get(STATS).json()["high_priority_unresolved"], 1)
        self.client.patch(f"/api/v1/requests/{request['id']}", {"status": "Resolved"})

        stats = self.client.get(STATS).json()
        self.assertEqual(stats["high_priority_unresolved"], 0)
        self.assertEqual(stats["resolved_requests"], 1)

    def test_recent_requests_are_newest_first_and_limited_to_five(self):
        ids = [self.make_request(title=f"Issue {index}")["id"] for index in range(7)]
        recent = self.client.get(STATS).json()["recent_requests"]
        self.assertEqual(len(recent), 5)
        self.assertEqual([r["id"] for r in recent], list(reversed(ids))[:5])

    def test_workload_lists_every_technician_with_active_counts(self):
        busy = self.make_technician(email="busy@example.com", name="Busy Tech")
        idle = self.make_technician(email="idle@example.com", name="Idle Tech")
        first = self.make_request()
        second = self.make_request()
        self.client.patch(f"/api/v1/requests/{first['id']}", {"technician_id": busy["id"]})
        self.client.patch(f"/api/v1/requests/{second['id']}", {"technician_id": busy["id"]})
        self.client.patch(f"/api/v1/requests/{second['id']}", {"status": "Resolved"})

        workload = {row["name"]: row for row in self.client.get(STATS).json()["technician_workload"]}
        self.assertEqual(workload["Busy Tech"]["active_requests"], 1)
        self.assertEqual(workload["Idle Tech"]["active_requests"], 0)
        self.assertEqual(workload["Idle Tech"]["technician_id"], idle["id"])

    def test_reports_technician_totals(self):
        self.make_technician(email="one@example.com", name="Tech One")
        self.make_technician(email="two@example.com", name="Tech Two", availability="Unavailable")
        self.make_technician(email="three@example.com", name="Tech Three")

        stats = self.client.get(STATS).json()
        self.assertEqual(stats["total_technicians"], 3)
        self.assertEqual(stats["available_technicians"], 2)

    def test_technician_totals_update_on_availability_change(self):
        technician = self.make_technician()
        self.assertEqual(self.client.get(STATS).json()["available_technicians"], 1)
        self.client.patch(f"/api/v1/technicians/{technician['id']}", {"availability": "Unavailable"})

        stats = self.client.get(STATS).json()
        self.assertEqual(stats["total_technicians"], 1)
        self.assertEqual(stats["available_technicians"], 0)


class HealthTests(ApiTestCase):
    def test_health_reports_database_ok(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})

    def test_api_docs_schema_is_served(self):
        response = self.client.get("/api/schema")
        self.assertEqual(response.status_code, 200)
