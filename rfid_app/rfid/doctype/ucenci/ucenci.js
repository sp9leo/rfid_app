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
                show_print_dialog(frm, r.message, values.reason || "");
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


function show_print_dialog(frm, data, reason) {
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
      print_lost_confirmation(data, reason);
    });

  d.fields_dict.print_html.$wrapper
    .find("#btn-print-new")
    .on("click", () => {
      print_new_confirmation(data);
    });
}


function print_lost_confirmation(data, reason) {
  const today = frappe.datetime.str_to_user(frappe.datetime.get_today());
  const school = frappe.sys_defaults.school_name || frappe.defaults.get_default("school_name") || "";

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${__("Izjava o izgubi RFID")}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { margin-bottom: 5px; }
    .header p { color: #666; }
    .field { margin: 12px 0; }
    .field b { display: inline-block; width: 180px; }
    .signature { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; border-top: 1px solid #333; padding-top: 5px; }
    @media print { body { padding: 20px; } }
  </style>
</head><body>
  <div class="header">
    <h2>${__("Izjava o izgubi RFID identifikacijske kartice")}</h2>
    <p>${school}</p>
  </div>

  <div class="field"><b>${__("Datum")}:</b> ${today}</div>
  <div class="field"><b>${__("Učenec")}:</b> ${data.student_name}</div>
  <div class="field"><b>${__("Učenec ID")}:</b> ${data.ucenec_id}</div>
  <div class="field"><b>${__("Oddelek")}:</b> ${data.oddelek || "-"}</div>
  <div class="field"><b>${__("Izgubljeni RFID")}:</b> <code>${data.old_rfid}</code></div>
  ${reason ? `<div class="field"><b>${__("Razlog")}:</b> ${reason}</div>` : ""}

  <p style="margin-top:30px;">
    ${__("S podpisom potrdim, da je zgornji RFID identifikacijski kartici bil izgubljen / poškodovan / ukraden in ga ne uporabljam več.")}
  </p>

  <div class="signature">
    <div class="signature-box">${__("Podpis učenca / starša")}</div>
    <div class="signature-box">${__("Podpis šole")}</div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body></html>`;

  open_print_window(html);
}


function print_new_confirmation(data) {
  const today = frappe.datetime.str_to_user(frappe.datetime.get_today());
  const school = frappe.sys_defaults.school_name || frappe.defaults.get_default("school_name") || "";

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${__("Potrdilo o novem RFID")}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { margin-bottom: 5px; }
    .header p { color: #666; }
    .field { margin: 12px 0; }
    .field b { display: inline-block; width: 180px; }
    .rfid-box { background: #f0f7ff; border: 2px solid #4a90d9; border-radius: 8px; padding: 15px 25px; text-align: center; margin: 25px 0; }
    .rfid-box code { font-size: 1.3em; font-weight: bold; color: #2c5f9e; }
    .signature { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; border-top: 1px solid #333; padding-top: 5px; }
    @media print { body { padding: 20px; } }
  </style>
</head><body>
  <div class="header">
    <h2>${__("Potrdilo o dodelitvi RFID identifikacijske kartice")}</h2>
    <p>${school}</p>
  </div>

  <div class="field"><b>${__("Datum")}:</b> ${today}</div>
  <div class="field"><b>${__("Učenec")}:</b> ${data.student_name}</div>
  <div class="field"><b>${__("Učenec ID")}:</b> ${data.ucenec_id}</div>
  <div class="field"><b>${__("Oddelek")}:</b> ${data.oddelek || "-"}</div>

  <div class="rfid-box">
    <div>${__("Vaš novi RFID")}</div>
    <code>${data.new_rfid}</code>
  </div>

  <p>
    ${__("S podpisom potrdim prevzem nove RFID identifikacijske kartice. Zavezujem se, da jo bom skrbno hranil in uporabljal v skladu s pravili šole.")}
  </p>

  <div class="signature">
    <div class="signature-box">${__("Podpis učenca / starša")}</div>
    <div class="signature-box">${__("Podpis šole")}</div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body></html>`;

  open_print_window(html);
}


function open_print_window(html) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    frappe.msgprint(__("Onemogočeno odpiranje okna za tiskanje. Dovolite pojavna okna za to stran."));
  }
}
