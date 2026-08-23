# Copyright (c) 2024, osaz and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestRFID(FrappeTestCase):
	def setUp(self):
		self.rfid = frappe.get_doc({
			"doctype": "RFID",
			"uuid": "TEST-RFID-001",
			"status": "Pripravljen",
		}).insert(ignore_permissions=True)

	def test_new_rfid_is_pripravljen(self):
		self.assertEqual(self.rfid.status, "Pripravljen")
		self.assertIsNone(self.rfid.link_ucenec)

	def test_aktiven_requires_ucenec(self):
		self.rfid.status = "Aktiven"
		self.assertRaises(frappe.ValidationError, self.rfid.save)

	def test_pripravljen_rejects_ucenec(self):
		self.rfid.link_ucenec = "some-student"
		self.assertRaises(frappe.ValidationError, self.rfid.save)

	def test_neaktiven_rejects_ucenec(self):
		ucenec = self._create_ucenec()
		self.rfid.status = "Aktiven"
		self.rfid.link_ucenec = ucenec.name
		self.rfid.save(ignore_permissions=True)

		self.rfid.status = "Neaktiven"
		self.assertRaises(frappe.ValidationError, self.rfid.save)

	def test_uuid_trimmed(self):
		self.rfid.uuid = "  TEST-RFID-002  "
		self.rfid.save(ignore_permissions=True)
		self.assertEqual(self.rfid.uuid, "TEST-RFID-002")

	def test_on_trash_releases_ucenec(self):
		ucenec = self._create_ucenec()
		frappe.db.set_value("RFID", self.rfid.name, {
			"status": "Aktiven",
			"link_ucenec": ucenec.name,
		})
		frappe.db.set_value("Ucenci", ucenec.name, "rfid", self.rfid.name)

		self.rfid.delete(ignore_permissions=True)
		ucenec.reload()
		self.assertIsNone(ucenec.rfid)

	def _create_ucenec(self):
		return frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Test",
			"priimek": "Učenec",
		}).insert(ignore_permissions=True)


class TestAssignRemove(FrappeTestCase):
	def setUp(self):
		self.rfid = frappe.get_doc({
			"doctype": "RFID",
			"uuid": "TEST-ASSIGN-001",
			"status": "Pripravljen",
		}).insert(ignore_permissions=True)

		self.ucenec = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Janez",
			"priimek": "Novak",
		}).insert(ignore_permissions=True)

	def test_assign_and_remove(self):
		from rfid_app.rfid.api import assign_rfid, remove_rfid

		result = assign_rfid(self.ucenec.name, self.rfid.name)
		self.assertEqual(result["status"], "ok")

		self.rfid.reload()
		self.ucenec.reload()
		self.assertEqual(self.rfid.status, "Aktiven")
		self.assertEqual(self.rfid.link_ucenec, self.ucenec.name)
		self.assertEqual(self.ucenec.rfid, self.rfid.name)

		result = remove_rfid(self.rfid.name, "Pripravljen")
		self.assertEqual(result["status"], "ok")

		self.rfid.reload()
		self.ucenec.reload()
		self.assertEqual(self.rfid.status, "Pripravljen")
		self.assertIsNone(self.rfid.link_ucenec)
		self.assertIsNone(self.ucenec.rfid)

	def test_assign_rejects_already_linked_student(self):
		other_rfid = frappe.get_doc({
			"doctype": "RFID",
			"uuid": "TEST-ASSIGN-002",
			"status": "Pripravljen",
		}).insert(ignore_permissions=True)

		from rfid_app.rfid.api import assign_rfid

		assign_rfid(self.ucenec.name, self.rfid.name)
		self.assertRaises(frappe.ValidationError, assign_rfid, self.ucenec.name, other_rfid.name)

	def test_assign_rejects_active_rfid(self):
		from rfid_app.rfid.api import assign_rfid

		self.rfid.status = "Aktiven"
		self.rfid.link_ucenec = "someone-else"
		self.rfid.save(ignore_permissions=True)

		self.assertRaises(frappe.ValidationError, assign_rfid, self.ucenec.name, self.rfid.name)

	def test_remove_to_neaktiven(self):
		from rfid_app.rfid.api import assign_rfid, remove_rfid

		assign_rfid(self.ucenec.name, self.rfid.name)
		result = remove_rfid(self.rfid.name, "Neaktiven")

		self.rfid.reload()
		self.assertEqual(self.rfid.status, "Neaktiven")

	def test_on_trash_ucenec_releases_rfid(self):
		from rfid_app.rfid.api import assign_rfid

		assign_rfid(self.ucenec.name, self.rfid.name)

		self.ucenec.delete(ignore_permissions=True)
		self.rfid.reload()
		self.assertEqual(self.rfid.status, "Pripravljen")
		self.assertIsNone(self.rfid.link_ucenec)


class TestRepair(FrappeTestCase):
	def test_repair_unlinked_active(self):
		rfid = frappe.get_doc({
			"doctype": "RFID",
			"uuid": "TEST-REPAIR-001",
			"status": "Pripravljen",
		}).insert(ignore_permissions=True)

		frappe.db.set_value("RFID", rfid.name, "status", "Aktiven")

		from rfid_app.rfid.api import repair_inconsistencies
		fixes = repair_inconsistencies()

		rfid.reload()
		self.assertEqual(rfid.status, "Pripravljen")
		self.assertTrue(any(f["type"] == "reset_status_no_link" for f in fixes))
