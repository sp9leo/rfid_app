// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.listview_settings["Obroki"] = {
  onload(listview) {
    listview.page.add_menu_item(__("Pozabljena kartica"), () => {
      show_forgot_rfid_dialog(listview);
    });
  },
};

function show_forgot_rfid_dialog(listview) {
  const d = new frappe.ui.Dialog({
    title: __("Zabeleži učenca brez kartice"),
    fields: [
      {
        label: "Učenec",
        fieldname: "ucenec",
        fieldtype: "Link",
        options: "Ucenci",
        reqd: 1,
      },
      {
        label: "Obrok",
        fieldname: "storitev",
        fieldtype: "Select",
        options: ["Zajtrk", "Malica", "Kosilo"],
        default: "Kosilo",
      },
      {
        fieldname: "info_html",
        fieldtype: "HTML",
      },
    ],
    primary_action_label: __("Zabeleži"),
    primary_action(values) {
      if (!values.ucenec) {
        return;
      }
      frappe.call({
        method: "rfid_app.rfid.api.log_forgot_rfid",
        args: {
          ucenec: values.ucenec,
          storitev: values.storitev || "Kosilo",
        },
        freeze: true,
        freeze_message: __("Zapisovanje..."),
        callback: function (r) {
          if (r.message) {
            const m = r.message;
            if (m.status === "exists") {
              frappe.show_alert({
                message: m.message,
                indicator: "orange",
              });
            } else {
              frappe.show_alert({
                message: m.message,
                indicator: "green",
              });
              listview.refresh();
            }
            d.hide();
          }
        },
      });
    },
  });

  d.fields_dict.info_html.$wrapper.html(
    `<div class="text-muted small">${__("Ista oseba bo zabeležena le enkrat dnevno.")}</div>`
  );

  d.show();
}