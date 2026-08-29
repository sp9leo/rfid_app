# Copyright (c) 2024, osaz and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestObroki(FrappeTestCase):
	def test_create_entry(self):
		doc = frappe.get_doc({
			"doctype": "Obroki",
			"datum": frappe.utils.today(),
			"storitev": "Kosilo",
			"status": "Prevzeto",
		}).insert(ignore_permissions=True, ignore_mandatory=True)
		self.assertTrue(doc.name)