# Copyright (c) 2024, osaz and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestUcenci(FrappeTestCase):
	def test_full_name_with_parts(self):
		doc = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Janez",
			"priimek": "Novak",
		}).insert(ignore_permissions=True)
		self.assertEqual(doc.full_name, "Janez Novak")

	def test_full_name_missing_parts(self):
		doc = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "",
			"priimek": "",
		}).insert(ignore_permissions=True)
		self.assertNotIn("None", doc.full_name)

	def test_ucenec_id_built(self):
		doc = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Test",
			"priimek": "Student",
			"zajtrk": 1,
			"kosilo": 1,
		}).insert(ignore_permissions=True)
		self.assertIn("ZK", doc.ucenec_id)
		self.assertTrue(doc.ucenec_id.startswith(doc.name))

	def test_rfid_link_consistency(self):
		rfid = frappe.get_doc({
			"doctype": "RFID",
			"uuid": "TEST-UCENCI-001",
			"status": "Pripravljen",
		}).insert(ignore_permissions=True)

		doc = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Test",
			"priimek": "Student",
		}).insert(ignore_permissions=True)

		doc.rfid = rfid.name
		doc.save(ignore_permissions=True)

		rfid.reload()
		frappe.db.set_value("RFID", rfid.name, "link_ucenec", "other-student")

		doc2 = frappe.get_doc({
			"doctype": "Ucenci",
			"ime": "Other",
			"priimek": "Student",
		}).insert(ignore_permissions=True)
		doc2.rfid = rfid.name

		self.assertRaises(frappe.ValidationError, doc2.save)
