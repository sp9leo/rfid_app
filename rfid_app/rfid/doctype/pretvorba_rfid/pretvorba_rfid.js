// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.ui.form.on("Pretvorba RFID", {
  refresh(frm) {
    if (!frm.doc.__islocal) {
      frm.add_custom_button(__("Izjava o izgubi RFID"), () => {
        print_lost_confirmation(frm);
      }, __("Natisni"));

      frm.add_custom_button(__("Potrdilo o novem RFID"), () => {
        print_new_confirmation(frm);
      }, __("Natisni"));
    }
  },
});


function print_lost_confirmation(frm) {
  const d = frm.doc;
  const today = frappe.datetime.str_to_user(d.transaction_date || frappe.datetime.get_today());
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
    .rfid-box { background: #fff3f3; border: 2px solid #d9534f; border-radius: 8px; padding: 15px 25px; text-align: center; margin: 25px 0; }
    .rfid-box code { font-size: 1.3em; font-weight: bold; color: #c9302c; }
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
  <div class="field"><b>${__("Učenec")}:</b> ${d.ucenec_name || d.ucenec}</div>
  <div class="field"><b>${__("Učenec ID")}:</b> ${d.ucenec_id || "-"}</div>
  <div class="field"><b>${__("Oddelek")}:</b> ${d.oddelek || "-"}</div>

  <div class="rfid-box">
    <div>${__("Izgubljeni RFID")}</div>
    <code>${d.old_rfid}</code>
  </div>

  ${d.reason ? `<div class="field"><b>${__("Razlog")}:</b> ${d.reason}</div>` : ""}

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


function print_new_confirmation(frm) {
  const d = frm.doc;
  const today = frappe.datetime.str_to_user(d.transaction_date || frappe.datetime.get_today());
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
  <div class="field"><b>${__("Učenec")}:</b> ${d.ucenec_name || d.ucenec}</div>
  <div class="field"><b>${__("Učenec ID")}:</b> ${d.ucenec_id || "-"}</div>
  <div class="field"><b>${__("Oddelek")}:</b> ${d.oddelek || "-"}</div>

  <div class="rfid-box">
    <div>${__("Vaš novi RFID")}</div>
    <code>${d.new_rfid}</code>
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
