# Builds the seasonal gift voucher emails (02-06) from one shared layout. Run: python3 build_emails.py
import re, json, html as H
SITE = 'https://www.primepiece.co.nz'
SANS = "'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif"
SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif"

def btn(label, href, bg='#5D8588', fg='#ffffff'):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:{bg};border-radius:999px;">'
            f'<a href="{href}" style="display:inline-block;padding:15px 32px;font-family:{SANS};font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:{fg};text-decoration:none;">{label}</a></td></tr></table>')

def row(inner, pad='18px 48px 0'):
    return f'<tr><td class="px" style="padding:{pad};">{inner}</td></tr>'

def p(text, size=16, color='#554F45'):
    return f'<div style="font-family:{SANS};font-size:{size}px;line-height:1.65;color:{color};">{text}</div>'

def page(title, preheader, eyebrow, headline, blocks):
    body = ''.join(blocks)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{H.escape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
<style>body{{margin:0;padding:0;background:#EBE5DA}}img{{border:0;display:block;max-width:100%;height:auto}}@media (max-width:620px){{.px{{padding-left:24px!important;padding-right:24px!important}}.h1{{font-size:40px!important}}}}</style></head>
<body style="margin:0;padding:0;background:#EBE5DA;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">{H.escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EBE5DA;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#F5F1EA;">
<tr><td align="center" class="px" style="padding:40px 48px 8px;"><a href="{SITE}/"><img src="{SITE}/logo-teal.png" width="170" alt="Prime Piece, one of one" style="width:170px;"></a></td></tr>
<tr><td class="px" style="padding:28px 48px 0;font-family:{SANS};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#5D8588;">{eyebrow}</td></tr>
<tr><td class="px h1" style="padding:12px 48px 0;font-family:{SERIF};font-size:48px;line-height:1.04;font-weight:300;color:#2C2A26;">{headline}</td></tr>
{body}
<tr><td class="px" style="padding:30px 48px 40px;"><div style="font-family:{SERIF};font-size:26px;font-style:italic;font-weight:300;color:#2C2A26;">James</div><div style="font-family:{SANS};font-size:13px;color:#8A8275;padding-top:2px;">Prime Piece, Auckland</div></td></tr>
<tr><td class="px" style="padding:24px 48px 32px;background:#2C2A26;font-family:{SANS};font-size:12px;line-height:1.7;color:#B8B0A3;">Prime Piece · 209B Archers Road, Wairau Valley, Auckland · 021 146 6990<br><a href="{SITE}/" style="color:#A8C3C5;">primepiece.co.nz</a> · <a href="https://www.instagram.com/prime.piece" style="color:#A8C3C5;">Instagram</a><br>{{% unsubscribe 'Unsubscribe' %}}</td></tr>
</table></td></tr></table></body></html>'''

GV = f'{SITE}/gift-vouchers.html'
def img(src, alt, full=True):
    return f'<tr><td style="padding:32px {"0" if full else "48px"} 0;"><a href="{GV}"><img src="{SITE}/{src}" width="{600 if full else 504}" alt="{alt}" style="width:100%;"></a></td></tr>'
def trio():
    cells = ''.join(f'<td width="33%" style="padding:0 4px;"><a href="{GV}"><img src="{SITE}/voucher-card-{v}.jpg" width="160" alt="${v} gift voucher" style="width:100%;border:1px solid #CFC6B6;"></a></td>' for v in (100, 200, 500))
    return f'<tr><td class="px" style="padding:30px 44px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table></td></tr>'

EMAILS = {
 '02-printed-card': dict(date='Fri 20 Nov', subject='Something to unwrap', preview='Add a printed stone card to any Prime Piece voucher. $25 posted, free to collect.',
   title='Something to unwrap', eyebrow='New · Printed gift cards', headline='Something<br><em style="color:#5D8588;">to unwrap.</em>',
   blocks=[row(p("Our gift vouchers now come as a printed card too. Choose a voucher, add a printed card at checkout, and we'll write the code on a card printed with the voucher's stone, add your message by hand and seal it in an envelope.")),
           img('voucher-card-200.jpg', 'Prime Piece $200 gift voucher, Teal Tide marble', full=False),
           row(p('<b style="color:#2C2A26;font-weight:500;">$25 posted</b> anywhere in New Zealand, or <b style="color:#2C2A26;font-weight:500;">free to collect</b> from the Wairau Valley showroom. The voucher is still emailed to you straight away.')),
           row(p('Order by <b style="color:#2C2A26;font-weight:500;">Tuesday 15 December</b> for Christmas delivery.', color='#5D8588'), '14px 48px 0'),
           row(btn('Add a printed card', GV), '26px 48px 0')]),
 '03-black-friday': dict(date='Fri 27 Nov (only if you choose the offer)', subject='Free posting on printed gift cards this weekend', preview='Black Friday at Prime Piece: we post your printed gift card free, until Monday night.',
   title='Free posting this weekend', eyebrow='Black Friday · This weekend only', headline='Free posting on<br><em style="color:#5D8588;">printed gift cards.</em>',
   blocks=[row(p("No discounts on the stone, but here's something better for Christmas: add a printed card to any gift voucher this weekend and we'll post it free, anywhere in New Zealand.")),
           trio(),
           row(p('Ends Monday 30 November at midnight. Order by Tuesday 15 December for Christmas delivery.', color='#5D8588'), '22px 48px 0'),
           row(btn('Shop gift vouchers', GV), '26px 48px 0')]),
 '04-last-posting-day': dict(date='Sat 12 Dec', subject='Last week to post a printed card', preview='Order by Tuesday 15 December for a printed Prime Piece gift card in time for Christmas.',
   title='Last week to post a printed card', eyebrow='Christmas posting', headline='Last week to post<br><em style="color:#5D8588;">a printed card.</em>',
   blocks=[row(p('If you want a Prime Piece gift voucher they can unwrap, order by <b style="color:#2C2A26;font-weight:500;">Tuesday 15 December</b>. We write the code and your message by hand and post it in time for Christmas.')),
           img('voucher-card-500.jpg', 'Prime Piece $500 gift voucher, Emerald Vein marble', full=False),
           row(p('After that, vouchers are still emailed instantly, right up to Christmas Eve.')),
           row(btn('Shop gift vouchers', GV), '26px 48px 0')]),
 '05-last-minute': dict(date='Sat 19 Dec', subject="Too late to post? It's emailed in seconds", preview='A Prime Piece gift voucher lands in their inbox seconds after you pay. No courier, no cut-off.',
   title="Too late to post? It's emailed in seconds", eyebrow='Last-minute gifts', headline='Forgot<br><em style="color:#5D8588;">someone?</em>',
   blocks=[row(p("A Prime Piece gift voucher lands in their inbox seconds after you pay, ready to forward or print. No courier, no cut-off: you can buy one on Christmas Eve.")),
           trio(),
           row(p('$100, $200 or $500 NZD. They choose any handcrafted stone piece, online or in the showroom, for up to 3 years.'), '22px 48px 0'),
           row(btn('Shop gift vouchers', GV), '26px 48px 0'),
           row(p("Prefer something to hand over? Printed cards can still be collected free from the showroom, Monday to Friday, 8am–5pm.", size=14, color='#8A8275'), '24px 48px 0')]),
 '06-boxing-day': dict(date='Sat 26 Dec', subject='Got a Prime Piece voucher?', preview="Here's what your gift voucher could become, and how to use it.",
   title='Got a Prime Piece voucher?', eyebrow='After Christmas', headline='Got a Prime Piece<br><em style="color:#5D8588;">voucher?</em>',
   blocks=[row(p("If someone gave you a Prime Piece gift voucher this Christmas, here's what it could become:")),
           row(f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:{SANS};font-size:15px;line-height:1.5;color:#554F45;">'
               + ''.join(f'<tr><td width="70" style="padding:12px 0;border-top:1px solid #CFC6B6;font-family:{SERIF};font-size:28px;color:#2C2A26;">{a}</td><td style="padding:12px 0;border-top:1px solid #CFC6B6;">{b}</td></tr>'
                         for a, b in [('$100', f'A marble or onyx <a href="{SITE}/boards.html" style="color:#5D8588;">serving board</a> ($99)'), ('$200', f'An entertaining <a href="{SITE}/boards.html" style="color:#5D8588;">platter</a> ($189), or two boards'), ('$500', f'A <a href="{SITE}/tables.html" style="color:#5D8588;">marble side table</a>, or a start on a basin or plinth')])
               + '</table>', '16px 48px 0'),
           row(p('Add a piece to your cart and enter your code in the Gift Voucher box at checkout, or bring it to the showroom (Monday to Friday, 8am–5pm). If you spend less, the change comes back as a new voucher.'), '20px 48px 0'),
           row(btn('Choose your piece', f'{SITE}/gallery.html', '#2C2A26', '#F5F1EA'), '26px 48px 0')]),
}

def text_version(e):
    t = re.sub(r'<br\s*/?>', '\n', ''.join(e['blocks']))
    t = re.sub(r'</(div|tr|td)>', '\n', t)
    t = H.unescape(re.sub(r'<[^>]+>', '', t))
    t = re.sub(r'\n\s*\n+', '\n\n', t).strip()
    head = H.unescape(re.sub(r'<[^>]+>', ' ', e['headline'].replace('<br>', ' '))).strip()
    return f"{re.sub(' +', ' ', head)}\n\n{t}\n\n{GV}\n\nJames\nPrime Piece, Auckland\n209B Archers Road, Wairau Valley, Auckland. 021 146 6990\n{{% unsubscribe 'Unsubscribe' %}}"

out = {}
for k, e in EMAILS.items():
    h = page(e['title'], e['preview'], e['eyebrow'], e['headline'], e['blocks'])
    h = re.sub(r'>\s+<', '><', h)
    open(f'{k}.html', 'w').write(h)
    open(f'{k}.txt', 'w').write(text_version(e))
    out[k] = dict(subject=e['subject'], preview=e['preview'], date=e['date'], size=len(h))
print(json.dumps(out, indent=1))
