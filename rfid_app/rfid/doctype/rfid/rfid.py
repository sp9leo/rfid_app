# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class RFID(Document):
    def validate(self):
        self.validate_uuid()
        self.validate_status_transitions()
        self.validate_link_consistency()

    def validate_uuid(self):
        if self.uuid:
            self.uuid = self.uuid.strip()

    def validate_status_transitions(self):
        if self.status == "Aktiven" and not self.link_ucenec:
            frappe.throw(_("Status ne more biti Aktiven če nima dodanega učenca"))

        if self.status == "Pripravljen" and self.link_ucenec:
            frappe.throw(_("Status ne more biti Pripravljen če ima dodanega učenca"))

        if self.status == "Neaktiven" and self.link_ucenec:
            frappe.throw(
                _("Najprej odstranite RFID z učenca, preden ga označite kot Neaktiven")
            )

    def validate_link_consistency(self):
        if self.link_ucenec:
            student_rfid = frappe.db.get_value("Ucenci", self.link_ucenec, "rfid")
            if student_rfid and student_rfid != self.name:
                frappe.throw(
                    _("Učenec {0} je že povezan z drugim RFID ({1})").format(
                        self.link_ucenec, student_rfid
                    )
                )
