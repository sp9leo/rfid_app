// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("Ucenci", {
  refresh(frm) {
    frm.page.clear_indicator();
    if (frm.doc.rfid) {
      frm.page.set_indicator(__('RFID dodeljen'), 'green');
    }
  },

  izberi_rfid(frm) {
    if (frm.doc.rfid) {
      zamenjaj_rfid(frm);
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
        });
      }
    );
  },
});


function zamenjaj_rfid(frm) {
  const old_rfid = frm.doc.rfid;

  const d = new frappe.ui.Dialog({
    title: __("Zamenjava RFID"),
    fields: [
      {
        fieldname: "current_html",
        fieldtype: "HTML",
        label: "Trenutni RFID",
      },
      {
        fieldname: "new_rfid",
        fieldtype: "Link",
        options: "RFID",
        label: "Novi RFID",
        reqd: 1,
        get_query: function () {
          return {
            filters: {
              status: "Pripravljen",
            },
          };
        },
      },
      {
        fieldname: "reason",
        fieldtype: "Small Text",
        label: "Razlog zamenjave",
        description: "Npr. izguba, poškodba, kraja...",
      },
    ],
    primary_action_label: __("Zamenjaj"),
    primary_action(values) {
      if (!values.new_rfid) {
        return;
      }

      frappe.confirm(
        __("Zamenjati RFID {0} z novim {1}?", [old_rfid, values.new_rfid]),
        () => {
          d.hide();
          frappe.call({
            method: "rfid_app.rfid.api.replace_rfid",
            args: {
              ucenec: frm.doc.name,
              new_rfid: values.new_rfid,
              reason: values.reason || "",
            },
            freeze: true,
            freeze_message: __("Zamenjava RFID-ja..."),
            callback: function (r) {
              if (r.message && r.message.status === "ok") {
                frappe.show_alert({
                  message: r.message.message,
                  indicator: "green",
                });
                frm.reload_doc();
                show_print_dialog(frm, r.message);
              }
            },
          });
        }
      );
    },
  });

  d.fields_dict.current_html.$wrapper.html(
    `<div style="padding:10px;background:#f5f5f5;border-radius:4px;margin-bottom:15px;">
      <b>${__("Trenutni RFID")}:</b> <code>${old_rfid}</code>
      <span style="color:#888;margin-left:10px;">(${__("status: Aktiven")})</span>
    </div>`
  );

  d.show();
}


function show_print_dialog(frm, data) {
  const d = new frappe.ui.Dialog({
    title: __("Natisni potrdila"),
    size: "large",
    fields: [
      {
        fieldname: "print_html",
        fieldtype: "HTML",
      },
    ],
    primary_action_label: __("Zapri"),
    primary_action() {
      d.hide();
    },
  });

  d.fields_dict.print_html.$wrapper.html(`
    <div style="padding:10px 0;">
      <p>${__("Zamenjava uspešna. Izberite potrdilo za tiskanje:")}</p>
      <div style="display:flex;gap:15px;margin-top:15px;">
        <button class="btn btn-primary btn-lg" id="btn-print-lost">
          <i class="fa fa-print"></i> ${__("Izjava o izgubi RFID")}
        </button>
        <button class="btn btn-success btn-lg" id="btn-print-new">
          <i class="fa fa-print"></i> ${__("Potrdilo o novem RFID")}
        </button>
      </div>
    </div>
  `);

  d.show();

  d.fields_dict.print_html.$wrapper
    .find("#btn-print-lost")
    .on("click", () => {
      print_native(data, "Izjava o izgubi RFID");
    });

  d.fields_dict.print_html.$wrapper
    .find("#btn-print-new")
    .on("click", () => {
      print_native(data, "Potrdilo o novem RFID");
    });
}


function print_native(data, print_format) {
  const meta = frappe.get_meta("Pretvorba RFID");
  if (meta) {
    const prev = meta.default_print_format;
    meta.default_print_format = print_format;
    setTimeout(() => {
      meta.default_print_format = prev;
    }, 5000);
  }
  frappe.set_route("print", "Pretvorba RFID", data.pretvorba_name);
}
