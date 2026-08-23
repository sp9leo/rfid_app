// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("RFID", {
  refresh(frm) {
    if (!frm.doc.link_ucenec) {
      frappe.db.get_value("Ucenci", { rfid: frm.doc.name }, "name", (r) => {
        if (r && r.name) {
          frm.set_value("link_ucenec", r.name);
          frm.set_value("status", "Aktiven");
          frm.save();
          frappe.show_alert("Ucenec field updated successfully");
        }
      });
    }

    if (frm.doc.link_ucenec && frm.doc.status === "Aktiven") {
      frm.set_df_property("status", "read_only", 1);
    } else if (!frm.doc.link_ucenec && frm.doc.status === "Aktiven") {
      frappe.throw("Status ne more biti Aktiven če nima dodanega učenca", {
        title: "Napaka",
      });
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
    const ucenec = frm.doc.link_ucenec;
    const rfid = frm.doc.name;

    frappe.db
      .get_value("Ucenci", { name: ucenec }, ["ime", "priimek"])
      .then((r) => {
        const values = r.message;
        const ucenecname = values.ime + " " + values.priimek;

        frappe.warn(
          "Are you sure you want to proceed?",
          `Osebi ${ucenecname} bo odstranjen RFID z UUID ${rfid}`,
          () => {
            frappe.call({
              method: "frappe.client.set_value",
              args: {
                doctype: "Ucenci",
                name: ucenec,
                fieldname: "rfid",
                value: null,
              },
              callback: function (response) {
                if (!response.exc) {
                  frappe.show_alert(`${ucenec} updated successfully`);
                  frm.set_value("status", "Pripravljen");
                  frm.set_value("link_ucenec", null);
                  frm.set_df_property("status", "read_only", 0);
                  frappe.show_alert("Status field unlocked");
                  frm.save();
                }
              },
            });
          },
          "Nadaljuj"
        );
      });
  },
});
