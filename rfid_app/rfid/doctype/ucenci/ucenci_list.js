// Copyright (c) 2024, osaz and contributors
// For license information, please see license.txt

frappe.listview_settings["Ucenci"] = {
  onload(listview) {
    listview.page.add_menu_item(
      __("Prestavi v novo šolsko leto"),
      () => {
        show_migration_dialog();
      }
    );

    listview.page.add_menu_item(
      __("Popravi neujemanja RFID"),
      () => {
        frappe.call({
          method: "rfid_app.rfid.api.repair_inconsistencies",
          freeze: true,
          freeze_message: __("Popravljanje neujemanj..."),
          callback: function (r) {
            if (r.message) {
              if (r.message.length === 0) {
                frappe.show_alert({
                  message: __("Vsi podatki so skladni."),
                  indicator: "green",
                });
              } else {
                frappe.msgprint({
                  title: __("Popravljeno: {0} neujemanj", [r.message.length]),
                  indicator: "orange",
                  message: r.message
                    .map(
                      (f) =>
                        `${f.type}: ${f.rfid || ""} ${f.ucenec || ""}`
                    )
                    .join("<br>"),
                });
              }
            }
          },
        });
      }
    );
  },
};

function show_migration_dialog() {
  const d = new frappe.ui.Dialog({
    title: __("Prestavi učence v novo šolsko leto"),
    size: "large",
    fields: [
      {
        label: "Iz leta",
        fieldname: "from_year",
        fieldtype: "Link",
        options: "Solsko leto",
        reqd: 1,
      },
      {
        label: "V leto",
        fieldname: "to_year",
        fieldtype: "Link",
        options: "Solsko leto",
        reqd: 1,
      },
      {
        label: "Sprosti RFID od učencev zaključnega letnika",
        fieldname: "release_rfid",
        fieldtype: "Check",
        default: 0,
        description: "Če označeno, bodo RFID kartice učencev 9. razreda vrnjene v zalogo.",
      },
      {
        fieldname: "preview_section",
        fieldtype: "HTML",
      },
    ],
    primary_action_label: __("Prikaži predogled"),
    primary_action(values) {
      if (!values.from_year || !values.to_year) {
        frappe.msgprint(__("Izberite obe šolski leti."));
        return;
      }

      frappe.call({
        method: "rfid_app.rfid.api.get_migration_preview",
        args: {
          from_year: values.from_year,
          to_year: values.to_year,
        },
        freeze: true,
        freeze_message: __("Generiranje predogleda..."),
        callback: function (r) {
          if (r.message) {
            const p = r.message;
            let html = '<div class="migration-preview" style="max-height:400px;overflow-y:auto;">';

            html += `<p><b>Skupaj učencev:</b> ${p.total}</p>`;

            if (!p.target_year_exists) {
              html += `<div class="alert alert-warning">${__("Ciljno šolsko leto {0} ne obstaja. Ustvarite ga pred izvedbo.", [values.to_year])}</div>`;
            }

            if (p.migrate.length > 0) {
              html += `<h5>${__("Za migracijo: {0}", [p.migrate.length])}</h5>`;
              html += '<table class="table table-sm"><thead><tr><th>Učenec</th><th>Iz</th><th>V</th><th>RFID</th></tr></thead><tbody>';
              p.migrate.forEach((s) => {
                html += `<tr><td>${s.full_name}</td><td>${s.from_oddelek}</td><td>${s.to_oddelek}</td><td>${s.rfid || "-"}</td></tr>`;
              });
              html += "</tbody></table>";
            }

            if (p.leavers.length > 0) {
              html += `<h5>${__("Zaključni (9. razred): {0}", [p.leavers.length])}</h5>`;
              html += '<table class="table table-sm"><thead><tr><th>Učenec</th><th>Oddelek</th><th>RFID</th></tr></thead><tbody>';
              p.leavers.forEach((s) => {
                html += `<tr><td>${s.full_name}</td><td>${s.oddelek}</td><td>${s.rfid || "-"}</td></tr>`;
              });
              html += "</tbody></table>";
            }

            if (p.blocked.length > 0) {
              html += `<h5 style="color:red">${__("BLOKIRANO: {0}", [p.blocked.length])}</h5>`;
              html += '<table class="table table-sm"><thead><tr><th>Učenec</th><th>Oddelek</th><th>Razlog</th></tr></thead><tbody>';
              p.blocked.forEach((s) => {
                html += `<tr><td>${s.full_name}</td><td>${s.oddelek || "-"}</td><td>${s.reason}</td></tr>`;
              });
              html += "</tbody></table>";
            }

            if (p.blocked.length === 0 && p.migrate.length > 0) {
              html += `<div style="margin-top:15px"><button class="btn btn-primary btn-sm" id="btn-execute-migration">${__("Izvedi migracijo")}</button></div>`;
            }

            html += "</div>";
            d.fields_dict.preview_section.$wrapper.html(html);

            if (p.blocked.length === 0 && p.migrate.length > 0) {
              d.fields_dict.preview_section.$wrapper
                .find("#btn-execute-migration")
                .on("click", () => {
                  frappe.confirm(
                    __("Ali ste prepričani? Prestavili boste {0} učencev v {1}.", [
                      p.migrate.length,
                      values.to_year,
                    ]),
                    () => {
                      frappe.call({
                        method: "rfid_app.rfid.api.execute_migration",
                        args: {
                          from_year: values.from_year,
                          to_year: values.to_year,
                          release_rfid_leavers: values.release_rfid || 0,
                        },
                        freeze: true,
                        freeze_message: __("Izvajanje migracije..."),
                        callback: function (r) {
                          if (r.message) {
                            const m = r.message;
                            frappe.msgprint({
                              title: __("Migracija končana"),
                              indicator: m.failed.length > 0 ? "orange" : "green",
                              message: __("Prestavljenih: {0}<br>Odpisanih: {1}<br>RFID vrnjenih: {2}<br>Napake: {3}", [
                                m.migrated,
                                m.leavers,
                                m.leavers_released,
                                m.failed.length,
                              ]),
                            });
                            d.hide();
                            cur_list.refresh();
                          }
                        },
                      });
                    }
                  );
                });
            }
          }
        },
      });
    },
  });

  d.show();
}
