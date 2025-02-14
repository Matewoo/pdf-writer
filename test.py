import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import Color
from PyPDF2 import PdfReader, PdfWriter

# Dateien einlesen
excel_file = "speiseplan.xlsx"
pdf_template = "speiseplan_vorlage.pdf"
pdf_temp = "temp_speiseplan.pdf"
pdf_output = "speiseplan_fertig.pdf"

pdfmetrics.registerFont(TTFont("FiraSans", "FiraSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansBold", "FiraSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansItalic", "FiraSans-Italic.ttf"))

dunkelrot = Color(159/255, 28/255, 12/255)
hellgruen = Color(0/255, 176/255, 80/255)

df = pd.read_excel(excel_file)

days = ["Mo", "Tu", "We", "Th", "Fr"]
site_map = {day: i +1 for i, day in enumerate(days)}


positions = {
    "Date": (80, 250),
    "Meat main dish": (100, 650),
    "Meat side dish": (300, 650),
    "Halal": (400, 650),
    "Veggi Main dish": (500, 650),
    "Veggi side dish": (700, 650),
    "Price": (900, 650)
}

c = canvas.Canvas(pdf_temp, pagesize=A4)

for _, row in df.iterrows():
    day = row["Day"]
    if day in site_map:
        y_offset = site_map[day] * -100  # Jede neue Seite etwas tiefer

        x, y = positions["Date"]
        c.setFont("FiraSansBold", 14)
        c.drawString(x, y + y_offset, row["Date"])

        c.setFont("FiraSans", 12)
        for spalte in positions.keys():
            if spalte != "Date":  # Restliche Spalten in Regular setzen
                x, y = positions[spalte]
                c.drawString(x, y + y_offset, str(row[spalte]))

c.save()


vorlage_reader = PdfReader(pdf_template)
text_reader = PdfReader(pdf_temp)
writer = PdfWriter()

for i in range(len(vorlage_reader.pages)):
    seite = vorlage_reader.pages[i]
    if i < len(text_reader.pages):  # Falls Textseite existiert
        seite.merge_page(text_reader.pages[i])
    writer.add_page(seite)

with open(pdf_output, "wb") as out_file:
    writer.write(out_file)

print("Speiseplan erfolgreich erstellt!")
