// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("Pozabljen RFID", {
	refresh(frm) {
		if (frm.is_new() && !frm.doc.datum) {
			frm.set_value("datum", frappe.datetime.get_today());
		}
	},
});