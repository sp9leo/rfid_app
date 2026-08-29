# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PretvorbaRFID(Document):
    def validate(self):
        if not self.operator:
            self.operator = frappe.utils.get_fullname(frappe.session.user) or frappe.session.user
