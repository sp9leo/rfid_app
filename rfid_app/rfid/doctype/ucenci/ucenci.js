// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("Ucenci", {
  izberi_rfid(frm) {
    if (frm.doc.rfid) {
      frappe.msgprint(__("Ta učenec že ima dodeljen RFID."));
      return;
    }

    frappe.prompt(
      {
        label: "Izberi RFID",
        fieldname: "rfid",
        fieldtype: "Link",
        options: "RFID",
        reqd: 1,
        primary_action_label: "Potrdi",
        get_query: function () {
          return {
            filters: {
              status: "Pripravljen",
            },
          };
        },
      },
      (values) => {
        frm.set_intro(__("Dodeljevanje RFID-ja..."), "orange");
        frappe.call({
          method: "rfid_app.rfid.api.assign_rfid",
          args: {
            ucenec: frm.doc.name,
            rfid: values.rfid,
          },
          freeze: true,
          freeze_message: __("Dodeljevanje RFID-ja..."),
          callback: function (r) {
            if (r.message) {
              frappe.show_alert({
                message: r.message.message,
                indicator: "green",
              });
              frm.reload_doc();
            }
          },
          error: function (r) {
            frm.clear_intro();
          },
        });
      }
    );
  },
});
