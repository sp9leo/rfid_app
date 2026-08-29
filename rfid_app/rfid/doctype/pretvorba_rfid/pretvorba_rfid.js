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
  const url = frappe.urllib.get_full_url(
    "/printview?doctype=" +
      encodeURIComponent("Pretvorba RFID") +
      "&name=" +
      encodeURIComponent(frm.doc.name) +
      "&format=" +
      encodeURIComponent(print_format) +
      "&no_letterhead=1&trigger_print=1"
  );
  const win = window.open(url, "_blank");
  if (!win) {
    frappe.msgprint(
      __("Onemogočeno odpiranje okna za tiskanje. Dovolite pojavna okna za to stran.")
    );
  }
}