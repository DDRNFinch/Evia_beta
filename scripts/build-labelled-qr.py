#!/usr/bin/python3
import html
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.graphics.barcode.qr import QrCodeWidget


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "course-delivery" / "qr"
CANVAS_WIDTH = 1200
CANVAS_HEIGHT = 1390
QR_TARGET = 1000
QUIET_ZONE = 4

COURSES = [
    {"code": "ST0095", "name": "Bricklayer", "payload": "EVIA1:ST0095"},
    {"code": "ST0264-SITE", "name": "Site Carpenter", "payload": "EVIA1:ST0264-SITE"},
    {"code": "ST0264-AJ", "name": "Architectural Joiner", "payload": "EVIA1:ST0264-AJ"},
    {"code": "6570-05-THIN", "name": "Thin Joint", "payload": "EVIA1:6570-05-THIN"},
    {"code": "6570-05-REPAIR", "name": "Repair & Maintenance", "payload": "EVIA1:6570-05-REPAIR"},
    {"code": "6570-05-SPECIALIST", "name": "Specialist Masonry", "payload": "EVIA1:6570-05-SPECIALIST"},
    {"code": "6570-05-DRAINAGE", "name": "Drainage", "payload": "EVIA1:6570-05-DRAINAGE"},
]


def font(size, bold=False):
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{filename}", size)


def centered_text(draw, y, text, selected_font, fill):
    bounds = draw.textbbox((0, 0), text, font=selected_font)
    width = bounds[2] - bounds[0]
    draw.text(((CANVAS_WIDTH - width) // 2, y), text, font=selected_font, fill=fill)


def qr_matrix(payload):
    widget = QrCodeWidget(payload, barLevel="H")
    widget.qr.make()
    return [[bool(cell) for cell in row] for row in widget.qr.modules]


def make_png(course):
    matrix = qr_matrix(course["payload"])
    modules = len(matrix)
    total_modules = modules + QUIET_ZONE * 2
    module_size = QR_TARGET // total_modules
    qr_size = module_size * total_modules
    origin_x = (CANVAS_WIDTH - qr_size) // 2
    origin_y = 58
    image = Image.new("RGB", (CANVAS_WIDTH, CANVAS_HEIGHT), "white")
    draw = ImageDraw.Draw(image)
    for row, cells in enumerate(matrix):
        for column, dark in enumerate(cells):
            if not dark:
                continue
            x0 = origin_x + (column + QUIET_ZONE) * module_size
            y0 = origin_y + (row + QUIET_ZONE) * module_size
            draw.rectangle((x0, y0, x0 + module_size - 1, y0 + module_size - 1), fill="#111111")

    caption_top = origin_y + qr_size + 44
    centered_text(draw, caption_top, course["name"], font(58, bold=True), "#18181b")
    centered_text(draw, caption_top + 82, course["code"], font(37), "#52525b")
    line_width = 150
    line_y = caption_top + 145
    draw.rounded_rectangle(
        ((CANVAS_WIDTH - line_width) // 2, line_y, (CANVAS_WIDTH + line_width) // 2, line_y + 10),
        radius=5,
        fill="#f2c536",
    )
    filename = f"{course['code']}.png"
    image.save(OUTPUT / filename, format="PNG", optimize=True)
    return {**course, "file": filename, "width": CANVAS_WIDTH, "height": CANVAS_HEIGHT, "modules": modules}


def make_download_page(courses):
    cards = "\n".join(
        f'''<article class="card">
  <img src="./{html.escape(course["file"])}" alt="{html.escape(course["name"])} QR code">
  <h2>{html.escape(course["name"])}</h2>
  <code>{html.escape(course["code"])}</code>
  <a download="{html.escape(course["file"])}" href="./{html.escape(course["file"])}">Download PNG</a>
</article>'''
        for course in courses
    )
    page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f2c536">
<title>Evia course QR codes</title>
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#f4f4f2;color:#1d1d20;font:16px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}main{{width:min(1120px,calc(100% - 2rem));margin:0 auto;padding:3rem 0 4rem}}header{{margin-bottom:2rem}}h1{{margin:0 0 .45rem;font-size:clamp(2rem,7vw,3.6rem);letter-spacing:-.045em}}header p{{max-width:44rem;margin:0;color:#666}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem}}.card{{background:#fff;border:1px solid #e5e5e2;border-radius:1.4rem;padding:1rem;box-shadow:0 8px 30px rgba(30,30,30,.05)}}.card img{{display:block;width:100%;height:auto;border-radius:.8rem;border:1px solid #eee}}h2{{margin:1rem 0 .15rem;font-size:1.2rem}}code{{display:block;color:#626267;font-size:.86rem}}a{{display:block;margin-top:1rem;padding:.8rem 1rem;border-radius:999px;background:#f2c536;color:#3f3308;text-align:center;text-decoration:none;font-weight:700}}.note{{margin-top:2rem;padding:1rem 1.15rem;border-radius:1rem;background:#fff8d8;color:#57470d}}@media print{{body{{background:#fff}}main{{width:100%;padding:0}}header,.note,a{{display:none}}.grid{{grid-template-columns:repeat(2,1fr)}}.card{{break-inside:avoid;box-shadow:none}}}}
</style>
</head>
<body>
<main>
<header><h1>Evia course QR codes</h1><p>Choose a labelled PNG to upload in Evia, or enter the course code shown underneath it.</p></header>
<section class="grid">{cards}</section>
<p class="note">These QR codes install Evia Beta course packs. The text below each QR is the matching manual course code.</p>
</main>
</body>
</html>
'''
    (OUTPUT / "all-courses.html").write_text(page, encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    courses = [make_png(course) for course in COURSES]
    manifest = {
        "eviaQrManifest": 1,
        "updated": "2026-08-21",
        "labelled": True,
        "courses": courses,
    }
    (OUTPUT / "manifest-v1.json").write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    make_download_page(courses)
    print(f"Built {len(courses)} labelled Evia QR PNGs.")


if __name__ == "__main__":
    main()
