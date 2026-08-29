// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("Pretvorba RFID", {
  refresh(frm) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(
        __("Izjava o izgubi RFID"),
        () => print_native(frm, "Izjava o izgubi RFID"),
        __("Natisni")
      );

      frm.add_custom_button(
        __("Potrdilo o novem RFID"),
        () => print_native(frm, "Potrdilo o novem RFID"),
        __("Natisni")
      );
    }
  },
});


function print_native(frm, print_format) {
  const meta = frappe.get_meta(frm.doctype);
  if (meta) {
    const prev = meta.default_print_format;
    meta.default_print_format = print_format;
    setTimeout(() => {
      meta.default_print_format = prev;
    }, 5000);
  }
  frm.print_doc();
}