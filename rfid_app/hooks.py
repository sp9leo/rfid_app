app_name = "rfid_app"
app_title = "RFID App"
app_publisher = "osaz"
app_description = "RFID tag management for school nutrition"
app_color = "#2490EF"
app_icon = "fa fa-rss"
app_email = "info@osaz.si"
app_license = "MIT"

# Frappe v16 only lists an app on the apps screen / desk when it declares this hook.
add_to_apps_screen = [
    {
        "name": "rfid_app",
        "title": "RFID App",
        "logo": "",
        "route": "/desk/rfid-module-workspace",
        "sequence_id": 10,
    }
]

doc_events = {
    "RFID": {
        "on_trash": "rfid_app.rfid.api.on_trash_rfid",
    },
    "Ucenci": {
        "on_trash": "rfid_app.rfid.api.on_trash_ucenec",
    },
}
