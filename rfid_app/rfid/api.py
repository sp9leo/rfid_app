import frappe
from frappe import _


@frappe.whitelist()
def assign_rfid(ucenec, rfid):
    """Atomically assign an RFID tag to a student.

    Both documents are locked and updated in a single transaction.
    """
    if not frappe.has_permission("RFID", "write") or not frappe.has_permission("Ucenci", "write"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    rfid_doc = frappe.get_doc("RFID", rfid, for_update=True)
    ucenec_doc = frappe.get_doc("Ucenci", ucenec, for_update=True)

    if ucenec_doc.rfid:
        frappe.throw(
            _("Učenec {0} že ima dodeljen RFID {1}").format(ucenec_doc.full_name, ucenec_doc.rfid)
        )

    if rfid_doc.status != "Pripravljen":
        frappe.throw(
            _("RFID {0} ni na voljo (status: {1})").format(rfid_doc.name, rfid_doc.status)
        )

    if rfid_doc.link_ucenec:
        linked_name = frappe.db.get_value("Ucenci", rfid_doc.link_ucenec, "full_name")
        frappe.throw(
            _("RFID {0} je že dodeljen učencu {1}").format(rfid_doc.name, linked_name or rfid_doc.link_ucenec)
        )

    rfid_doc.status = "Aktiven"
    rfid_doc.link_ucenec = ucenec
    rfid_doc.save(ignore_permissions=True)

    ucenec_doc.rfid = rfid
    ucenec_doc.save(ignore_permissions=True)

    frappe.db.commit()

    return {
        "status": "ok",
        "message": _("RFID {0} dodeljen učencu {1}").format(rfid, ucenec_doc.full_name),
    }


@frappe.whitelist()
def remove_rfid(rfid, new_status="Pripravljen"):
    """Atomically remove RFID from student.

    Both documents are locked and updated in a single transaction.
    """
    if not frappe.has_permission("RFID", "write") or not frappe.has_permission("Ucenci", "write"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    allowed_statuses = ["Pripravljen", "Neaktiven"]
    if new_status not in allowed_statuses:
        frappe.throw(_("Nedovoljen novi status: {0}").format(new_status))

    rfid_doc = frappe.get_doc("RFID", rfid, for_update=True)

    if not rfid_doc.link_ucenec:
        frappe.throw(_("RFID {0} ni dodeljen nikomur").format(rfid))

    ucenec_name = rfid_doc.link_ucenec

    ucenec_doc = frappe.get_doc("Ucenci", ucenec_name, for_update=True)

    ucenec_doc.rfid = None
    ucenec_doc.save(ignore_permissions=True)

    rfid_doc.status = new_status
    rfid_doc.link_ucenec = None
    rfid_doc.save(ignore_permissions=True)

    frappe.db.commit()

    ucenec_full = ucenec_doc.full_name or ucenec_name
    return {
        "status": "ok",
        "message": _("RFID {0} odstranjen učencu {1}").format(rfid, ucenec_full),
    }


@frappe.whitelist()
def replace_rfid(ucenec, new_rfid, reason=None):
    """Atomically replace a student's RFID.

    Old RFID → Neaktiven (lost), new RFID → Aktiven.
    Creates a Pretvorba RFID log entry.
    """
    if not frappe.has_permission("RFID", "write") or not frappe.has_permission("Ucenci", "write"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    ucenec_doc = frappe.get_doc("Ucenci", ucenec, for_update=True)

    if not ucenec_doc.rfid:
        frappe.throw(_("Učenec {0} nima dodeljenega RFID-ja za zamenjavo").format(
            ucenec_doc.full_name
        ))

    old_rfid_name = ucenec_doc.rfid
    old_rfid_doc = frappe.get_doc("RFID", old_rfid_name, for_update=True)

    new_rfid_doc = frappe.get_doc("RFID", new_rfid, for_update=True)

    if new_rfid_doc.status != "Pripravljen":
        frappe.throw(
            _("Novi RFID {0} ni na voljo (status: {1})").format(new_rfid_doc.name, new_rfid_doc.status)
        )

    if new_rfid_doc.link_ucenec:
        linked_name = frappe.db.get_value("Ucenci", new_rfid_doc.link_ucenec, "full_name")
        frappe.throw(
            _("RFID {0} je že dodeljen učencu {1}").format(new_rfid_doc.name, linked_name or new_rfid_doc.link_ucenec)
        )

    old_rfid_doc.status = "Neaktiven"
    old_rfid_doc.link_ucenec = None
    old_rfid_doc.save(ignore_permissions=True)

    frappe.db.set_value("Ucenci", ucenec, "rfid", new_rfid)

    new_rfid_doc.status = "Aktiven"
    new_rfid_doc.link_ucenec = ucenec
    new_rfid_doc.save(ignore_permissions=True)

    pretvorba = frappe.get_doc({
        "doctype": "Pretvorba RFID",
        "ucenec": ucenec,
        "old_rfid": old_rfid_name,
        "new_rfid": new_rfid,
        "reason": reason or "",
        "school_name": frappe.defaults.get_global_default("school_name") or "",
        "operator": frappe.utils.get_fullname(frappe.session.user) or frappe.session.user,
    })
    pretvorba.insert(ignore_permissions=True)

    frappe.db.commit()

    return {
        "status": "ok",
        "message": _("RFID zamenjan: {0} → {1}").format(old_rfid_name, new_rfid),
        "old_rfid": old_rfid_name,
        "new_rfid": new_rfid,
        "pretvorba_name": pretvorba.name,
        "student_name": ucenec_doc.full_name,
        "student_id": ucenec_doc.name,
        "oddelek": ucenec_doc.oddelek,
        "ucenec_id": ucenec_doc.ucenec_id,
    }


def on_trash_rfid(doc, method):
    """Release linked student when RFID is deleted."""
    if doc.link_ucenec:
        frappe.db.set_value("Ucenci", doc.link_ucenec, "rfid", None)


def on_trash_ucenec(doc, method):
    """Release RFID when student is deleted."""
    if doc.rfid:
        frappe.db.set_value(
            "RFID",
            doc.rfid,
            {"status": "Pripravljen", "link_ucenec": None},
        )


@frappe.whitelist()
def repair_inconsistencies():
    """Find and fix one-sided RFID↔Ucenci linkages. Returns a report."""
    fixes = []

    orphans = frappe.get_all(
        "RFID",
        filters={"link_ucenec": ["is", "set"], "status": ["!=", "Aktiven"]},
        fields=["name", "status", "link_ucenec"],
    )
    for r in orphans:
        student_rfid = frappe.db.get_value("Ucenci", r.link_ucenec, "rfid")
        if student_rfid != r.name:
            frappe.db.set_value("Ucenci", r.link_ucenec, "rfid", None)
            fixes.append({"type": "unlinked_stale_pointer", "rfid": r.name, "ucenec": r.link_ucenec})

    active_no_link = frappe.get_all(
        "RFID",
        filters={"status": "Aktiven", "link_ucenec": ["is", "not set"]},
        fields=["name"],
    )
    for r in active_no_link:
        frappe.db.set_value("RFID", r.name, "status", "Pripravljen")
        fixes.append({"type": "reset_status_no_link", "rfid": r.name})

    linked_ucenci = frappe.get_all(
        "Ucenci",
        filters={"rfid": ["is", "set"]},
        fields=["name", "rfid"],
    )
    for u in linked_ucenci:
        rfid_link = frappe.db.get_value("RFID", u.rfid, "link_ucenec")
        if rfid_link != u.name:
            frappe.db.set_value("Ucenci", u.name, "rfid", None)
            fixes.append({"type": "unlinked_student_pointer", "ucenec": u.name, "rfid": u.rfid})

    unlinked_ucenci = frappe.get_all(
        "RFID",
        filters={"link_ucenec": ["is", "set"]},
        fields=["name", "link_ucenec"],
    )
    for r in unlinked_ucenci:
        student_rfid = frappe.db.get_value("Ucenci", r.link_ucenec, "rfid")
        if student_rfid != r.name:
            frappe.db.set_value("Ucenci", r.link_ucenec, "rfid", r.name)
            fixes.append({"type": "restored_student_pointer", "ucenec": r.link_ucenec, "rfid": r.name})

    frappe.db.commit()
    return fixes


# --- School Year Migration ---


@frappe.whitelist()
def get_migration_preview(from_year, to_year):
    """Generate a dry-run preview of student migration.

    Returns lists of: students to migrate, leavers, and blocked (unmapped oddelek).
    """
    students = frappe.get_all(
        "Ucenci",
        filters={"solsko_leto": from_year},
        fields=["name", "full_name", "ime", "priimek", "oddelek", "rfid"],
    )

    oddelek_map = {}
    for s in students:
        if s.oddelek and s.oddelek not in oddelek_map:
            target = frappe.db.get_value("Oddelek", s.oddelek, "next_oddelek")
            oddelek_map[s.oddelek] = target

    migrate = []
    leavers = []
    blocked = []

    for s in students:
        target = oddelek_map.get(s.oddelek)

        if not target and s.oddelek:
            razred = frappe.db.get_value("Oddelek", s.oddelek, "razred")
            if str(razred) == "9":
                leavers.append({
                    "name": s.name,
                    "full_name": s.full_name,
                    "oddelek": s.oddelek,
                    "rfid": s.rfid,
                    "reason": "9. razred — zaključek šolanja",
                })
            else:
                blocked.append({
                    "name": s.name,
                    "full_name": s.full_name,
                    "oddelek": s.oddelek,
                    "reason": "Ni določenega ciljnega oddelka (next_oddelek)",
                })
        elif not s.oddelek:
            blocked.append({
                "name": s.name,
                "full_name": s.full_name,
                "oddelek": None,
                "reason": "Ni dodeljen nobenemu oddelku",
            })
        else:
            target_name = frappe.db.get_value("Oddelek", target, "name") if target else None
            migrate.append({
                "name": s.name,
                "full_name": s.full_name,
                "from_oddelek": s.oddelek,
                "to_oddelek": target_name or target,
                "rfid": s.rfid,
            })

    target_year_exists = frappe.db.exists("Solsko leto", to_year)

    return {
        "migrate": migrate,
        "leavers": leavers,
        "blocked": blocked,
        "total": len(students),
        "target_year_exists": bool(target_year_exists),
    }


@frappe.whitelist()
def execute_migration(from_year, to_year, release_rfid_leavers=0):
    """Execute the bulk migration. Enqueued for long-running jobs.

    Args:
        from_year: source school year name
        to_year: target school year name
        release_rfid_leavers: if truthy, release RFID tags from leavers
    """
    if not frappe.has_permission("Ucenci", "write"):
        frappe.throw(_("Insufficient permissions"))

    if not frappe.db.exists("Solsko leto", to_year):
        frappe.throw(_("Ciljno šolsko leto {0} ne obstaja").format(to_year))

    preview = get_migration_preview(from_year, to_year)

    if preview["blocked"]:
        blocked_names = ", ".join(b["name"] for b in preview["blocked"])
        frappe.throw(
            _("Migracija blokirana: {0} učencev nima ciljnega oddelka. ({1})").format(
                len(preview["blocked"]), blocked_names
            )
        )

    migrated = 0
    failed = []

    for item in preview["migrate"]:
        try:
            ucenec = frappe.get_doc("Ucenci", item["name"], for_update=True)

            if ucenec.solsko_leto == to_year:
                continue

            ucenec.oddelek = item["to_oddelek"]
            ucenec.save(ignore_permissions=True)

            if item["rfid"]:
                frappe.db.set_value("RFID", item["rfid"], "oddelek", item["to_oddelek"])

            migrated += 1
        except Exception:
            failed.append({"name": item["name"], "error": frappe.get_traceback()})

    leavers_released = 0
    if release_rfid_leavers:
        for leaver in preview["leavers"]:
            if leaver["rfid"]:
                try:
                    frappe.db.set_value(
                        "RFID",
                        leaver["rfid"],
                        {"status": "Pripravljen", "link_ucenec": None},
                    )
                    frappe.db.set_value("Ucenci", leaver["name"], "rfid", None)
                    leavers_released += 1
                except Exception:
                    failed.append({"name": leaver["name"], "error": frappe.get_traceback()})

    frappe.db.commit()

    return {
        "migrated": migrated,
        "leavers": len(preview["leavers"]),
        "leavers_released": leavers_released,
        "failed": failed,
    }


@frappe.whitelist()
def create_next_school_year(start_date, end_date=None):
    """Create the next school year from start/end dates.

    Derives the name as YYYY/YYYY+1 from start_date.
    """
    import datetime

    start = frappe.utils.getdate(start_date)
    year = start.year

    if start.month >= 8:
        sy_name = f"{year}/{str(year + 1)[-2:]}"
    else:
        sy_name = f"{year - 1}/{str(year)[-2:]}"

    if frappe.db.exists("Solsko leto", sy_name):
        frappe.throw(_("Šolsko leto {0} že obstaja").format(sy_name))

    if not end_date:
        end_date = datetime.date(year if start.month < 8 else year + 1, 6, 30)

    doc = frappe.get_doc({
        "doctype": "Solsko leto",
        "school_year": sy_name,
        "school_year_start": start_date,
        "school_year_end": end_date,
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"name": doc.name, "start": str(start_date), "end": str(end_date)}
