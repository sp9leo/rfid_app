# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RFID(Document):
	def validate(self):
		if self.status == "Aktiven" and not self.link_ucenec:
			frappe.throw("Status ne more biti Aktiven če nima dodanega učenca")
		if self.status == "Pripravljen" and self.link_ucenec:
			frappe.throw("Status ne more biti Pripravljen če ima dodanega učenca")
