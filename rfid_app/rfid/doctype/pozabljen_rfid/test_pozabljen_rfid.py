# Copyright (c) 2024, osaz and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestPozabljenRFID(FrappeTestCase):
	def test_create_entry_with_default_date(self):
		doc = frappe.get_doc({
			"doctype": "Pozabljen RFID",
			"datum": frappe.utils.today(),
			"storitev": "Kosilo",
		}).insert(ignore_permissions=True, ignore_mandatory=True)
		self.assertTrue(doc.name)
		self.assertEqual(frappe.db.get_value("Pozabljen RFID", doc.name, "datum"), frappe.utils.today())