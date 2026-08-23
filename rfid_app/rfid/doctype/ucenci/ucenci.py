# Copyright (c) 2024, osaz and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Ucenci(Document):
    def before_save(self):
        self.full_name = f"{self.ime or ''} {self.priimek or ''}".strip()

    def validate(self):
        self.validate_rfid_link()
        self.build_ucenec_id()

    def validate_rfid_link(self):
        if self.rfid:
            rfid_link_ucenec = frappe.db.get_value("RFID", self.rfid, "link_ucenec")
            if rfid_link_ucenec and rfid_link_ucenec != self.name:
                frappe.throw(
                    _("RFID {0} je že povezan z drugim učencem ({1})").format(
                        self.rfid, rfid_link_ucenec
                    )
                )

    def build_ucenec_id(self):
        a = str(self.zajtrk or 0).replace("1", "Z")
        b = str(self.malica or 0).replace("1", "M")
        c = str(self.kosilo or 0).replace("1", "K")
        d = str(self.vozac or 0).replace("1", "V")
        e = str(self.dieta or 0).replace("1", "D")
        n = str(self.name)
        o = str(getattr(self, "oddelek", "") or "")

        name = n + "-" + a + b + c + d + e + o
        self.ucenec_id = name
