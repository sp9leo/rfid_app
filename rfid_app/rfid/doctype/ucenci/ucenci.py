# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Ucenci(Document):
	def before_save(self):
		self.full_name = f"{self.ime} {self.priimek}"

	def validate(self):
		a = str(self.zajtrk).replace("1", "Z")
		b = str(self.malica).replace("1", "M")
		c = str(self.kosilo).replace("1", "K")
		d = str(self.vozac).replace("1", "V")
		e = str(self.dieta).replace("1", "D")
		n = str(self.name)
		o = str(getattr(self, "oddelek", ""))

		name = n + "-" + a + b + c + d + e + o
		name = str(name)
		self.ucenec_id = name
