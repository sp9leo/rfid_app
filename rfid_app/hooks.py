app_name = "rfid_app"
app_title = "RFID App"
app_publisher = "osaz"
app_description = "RFID tag management for school nutrition"
app_color = "#2490EF"
app_icon = "fa fa-rss"
app_email = "info@osaz.si"
app_license = "MIT"

doc_events = {
    "RFID": {
        "on_trash": "rfid_app.rfid.api.on_trash_rfid",
    },
    "Ucenci": {
        "on_trash": "rfid_app.rfid.api.on_trash_ucenec",
    },
}
