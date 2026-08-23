// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("RFID", {
  refresh(frm) {
    if (frm.doc.link_ucenec && frm.doc.status === "Aktiven") {
      frm.set_df_property("status", "read_only", 1);
    }

    frm.fields_dict["izbrisi_rfid"]
      .$wrapper.find("button")
      .html('<i class="fa fa-trash"></i> Odstrani RFID ucencu')
      .css({
        "background-color": "var(--danger)",
        color: "#ffffff",
      });
  },

  izbrisi_rfid(frm) {
    if (!frm.doc.link_ucenec) {
      frappe.msgprint(__("Ta RFID ni dodeljen nikomur."));
      return;
    }

    frappe.db
      .get_value("Ucenci", { name: frm.doc.link_ucenec }, ["ime", "priimek"])
      .then((r) => {
        const values = r.message;
        const ucenecname = (values.ime || "") + " " + (values.priimek || "");

        frappe.prompt(
          [
            {
              label: "Novi status",
              fieldname: "new_status",
              fieldtype: "Select",
              options: "Pripravljen\nNeaktiven",
              default: "Pripravljen",
              reqd: 1,
              description:
                "Pripravljen = RFID bo ponovno na voljo. Neaktiven = RFID označen kot izgubljen/uničen.",
            },
          ],
          (values) => {
            frm.set_intro(__("Odstranjevanje RFID-ja..."), "orange");
            frappe.call({
              method: "rfid_app.rfid.api.remove_rfid",
              args: {
                rfid: frm.doc.name,
                new_status: values.new_status,
              },
              freeze: true,
              freeze_message: __("Odstranjevanje RFID-ja..."),
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
          },
          __("Odstrani RFID učencu {0}?", [ucenecname.trim()]),
          "Nadaljuj"
        );
      });
  },
});
