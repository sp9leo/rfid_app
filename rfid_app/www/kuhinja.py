import frappe

from rfid_app.rfid.api import _get_forgot_rfid_entries


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/kuhinja"
		raise frappe.Redirect

	context.no_cache = 1
	context.title = "Kuhinja — pozabljena kartica"
	context.today = frappe.utils.today()
	context.entries = _get_forgot_rfid_entries(context.today)