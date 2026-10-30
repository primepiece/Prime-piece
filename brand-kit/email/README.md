# Emails

| File | What | In Klaviyo |
|---|---|---|
| `01-launch-email.html` / `.txt` | Launch, "Can't choose? Let them." Thu 5 Nov | Draft campaign "Gift voucher launch — 5 Nov 2026" |
| `02-printed-card` | "Something to unwrap." Fri 20 Nov, only once printed cards are live | Draft "Printed gift card launch — 20 Nov 2026" |
| `03-black-friday` | Free posting on printed cards. Fri 27 Nov, only if you choose the offer | Draft "Black Friday free posting — 27 Nov 2026" |
| `04-last-posting-day` | "Last week to post a printed card." Sat 12 Dec | Draft "Last week to post a printed card — 12 Dec 2026" |
| `05-last-minute` | "Forgot someone?" Sat 19 Dec | Draft "Last-minute gift vouchers — 19 Dec 2026" |
| `06-boxing-day` | "Got a Prime Piece voucher?" Sat 26 Dec | Draft "Got a Prime Piece voucher? — 26 Dec 2026" |

All campaigns go to the Email List from "James at Prime Piece" and none is scheduled. `02`–`06` are built by
`build_emails.py` from one shared layout; edit the copy there and re-run it.

Images load from primepiece.co.nz (logo, the three voucher cards and the Teal Tide platter photo), so they work in any
email app. Headlines use Cormorant Garamond where the app loads web fonts and Georgia elsewhere.
`01-launch-email-preview.png` shows the layout.
