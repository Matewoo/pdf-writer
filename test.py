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

# Schriftarten registrieren
pdfmetrics.registerFont(TTFont("FiraSans", "FiraSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansBold", "FiraSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansItalic", "FiraSans-Italic.ttf"))

# Farben definieren
dunkelrot = Color(159/255, 28/255, 12/255)
hellgruen = Color(0/255, 176/255, 80/255)
schwarz = Color(0, 0, 0)

# Excel-Daten laden und NaN-Werte durch leere Strings ersetzen
df = pd.read_excel(excel_file).fillna("")

# Positionen für jede Spalte (feste X/Y-Koordinaten)
positions = {
    "Date": (82, 589),
    "Meat main dish": (82, 539),
    "Meat side dish": (82, 524),
    "Halal": (400, 700),
    "Meat price": (500, 700),
    "Veggi Main dish": (500, 700),
    "Veggi side dish": (700, 700),
    "Veggi price": (900, 700)
}

# PDF erstellen
c = canvas.Canvas(pdf_temp, pagesize=A4)

erste_seite = True  # Flag, um sicherzustellen, dass nicht direkt umgeblättert wird

for _, row in df.iterrows():
    if not erste_seite:
        c.showPage()  # Neue Seite NUR NACH dem ersten Eintrag
    else:
        erste_seite = False  # Nach der ersten Iteration abschalten

    # Wochentag & Datum fett/rot setzen
    x, y = positions["Date"]
    c.setFont("FiraSansBold", 14)
    c.setFillColor(dunkelrot)
    c.drawString(x, y, row["Date"])

    # Fleischgericht Hauptgericht fett/schwarz
    x, y = positions["Meat main dish"]
    c.setFont("FiraSansBold", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["Meat main dish"])


    # Restliche Spalten in normaler Schrift
    c.setFont("FiraSans", 12)
    c.setFillColor(schwarz)  # Falls du eine zweite Farbe brauchst

    for spalte in positions.keys():
        if spalte != "Date" and spalte != "Meat main dish":  # Alle anderen Werte normal schreiben
            x, y = positions[spalte]
            c.drawString(x, y, str(row[spalte]))

c.save()

# PDF-Vorlage mit der generierten Text-PDF kombinieren
vorlage_reader = PdfReader(pdf_template)
text_reader = PdfReader(pdf_temp)
writer = PdfWriter()

for i in range(len(vorlage_reader.pages)):
    seite = vorlage_reader.pages[i]
    if i < len(text_reader.pages):  # Falls eine Textseite existiert
        seite.merge_page(text_reader.pages[i])
    writer.add_page(seite)

# Finale PDF speichern
with open(pdf_output, "wb") as out_file:
    writer.write(out_file)

print("Speiseplan erfolgreich erstellt!")
