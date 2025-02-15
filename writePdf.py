import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import Color
from PyPDF2 import PdfReader, PdfWriter
import sqlite3
import sys

# Argumente einlesen
if len(sys.argv) != 2:
    print("Usage: python writePdf.py <week>")
    sys.exit(1)

week = sys.argv[1].replace("-", " ")
#week = "KW7 2025"  # Hardcoded week value for testing
print(f"Week parameter: {week}")  # Debugging-Ausgabe

# Datenbankverbindung herstellen
conn = sqlite3.connect('menu.db')
cursor = conn.cursor()

# Daten aus der Datenbank laden
query = "SELECT * FROM menu_entries WHERE week = ?"
#print(f"Executing query: {query} with parameter: {week}")  # Debugging-Ausgabe
df = pd.read_sql_query(query, conn, params=(week,))

# NaN-Werte durch leere Strings ersetzen
df = df.fillna("")

# Überprüfe die Datenbankabfrage
#print(df.head())  # Ausgabe der ersten Zeilen des DataFrames

# Dateien einlesen
pdf_template = "speiseplan_vorlage.pdf"
pdf_temp = "temp_speiseplan.pdf"
pdf_output = "speiseplan_fertig.pdf"

# Schriftarten registrieren
pdfmetrics.registerFont(TTFont("FiraSans", "FiraSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansMedium", "FiraSans-Medium.ttf"))
pdfmetrics.registerFont(TTFont("FiraSansItalic", "FiraSans-Italic.ttf"))

# Farben definieren
dunkelrot = Color(159/255, 28/255, 12/255)
hellgruen = Color(0/255, 176/255, 80/255)
schwarz = Color(0, 0, 0)

# Positionen für jede Spalte (feste X/Y-Koordinaten)
positions = {
    "Date": (82, 587),
    "Meat main dish": (82, 539),
    "Meat side dish": (82, 524),
    "Halal": (186, 566),
    "Meat price": (82, 500),
    "Veggi main dish": (82, 451),
    "Veggi side dish": (82, 436),
    "Veggi price": (82, 408)
}

# Überprüfe die Datenbankabfrage
#print(df.head())  # Ausgabe der ersten Zeilen des DataFrames

# PDF erstellen
c = canvas.Canvas(pdf_temp, pagesize=A4)

erste_seite = True  # Flag, um sicherzustellen, dass nicht direkt umgeblättert wird

for _, row in df.iterrows():
    #print(row)  # Ausgabe der aktuellen Zeile
    if not erste_seite:
        c.showPage()  # Neue Seite NUR NACH dem ersten Eintrag
    else:
        erste_seite = False  # Nach der ersten Iteration abschalten

    # Wochentag & Datum fett/rot setzen
    x, y = positions["Date"]
    c.setFont("FiraSansMedium", 14)
    c.setFillColor(dunkelrot)
    c.drawString(x, y, row["date_title"])

    # Fleischgericht Hauptgericht fett/schwarz
    x, y = positions["Meat main dish"]
    c.setFont("FiraSansMedium", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["meat_main"])

    # Fleischgericht Beilage fett/schwarz
    x, y = positions["Meat side dish"]
    c.setFont("FiraSans", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["meat_side"])

    # Veggi Hauptgericht fett/schwarz
    x, y = positions["Veggi main dish"]
    c.setFont("FiraSansMedium", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["veggi_main"])

    # Veggi Beilage fett/schwarz
    x, y = positions["Veggi side dish"]
    c.setFont("FiraSans", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["veggi_side"])

    # Fleischgericht Preis kursiv/schwarz
    x, y = positions["Meat price"]
    c.setFont("FiraSansItalic", 10)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["meat_price"])

    # Veggi Preis kursiv/schwarz
    x, y = positions["Veggi price"]
    c.setFont("FiraSansItalic", 10)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["veggi_price"])

    if row["halal"]:
        x, y = positions["Halal"]
        c.setFont("FiraSansMedium", 13)
        c.setFillColor(hellgruen)
        c.drawString(x, y, '„HALAL“')

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