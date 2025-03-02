import os
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
    print("Usage: python writePdf.py <day>")
    sys.exit(1)

day = sys.argv[1]

print(f"Day parameter: {day}")  # Debugging-Ausgabe

base_dir = os.path.dirname(os.path.abspath(__file__))

# Datenbankverbindung herstellen
db_path = os.path.join(base_dir, "../../../pdf-writer-data/menu.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Daten aus der Datenbank laden
query = "SELECT * FROM daily_entries WHERE date = ?"
#print(f"Executing query: {query} with parameter: {week}")  # Debugging-Ausgabe
df = pd.read_sql_query(query, conn, params=(day,))

# NaN-Werte durch leere Strings ersetzen
df = df.fillna("")

# Überprüfe die Datenbankabfrage
#print(df.head())  # Ausgabe der ersten Zeilen des DataFrames

# Dateien einlesen
pdf_template = os.path.join(base_dir, "../../data/tagesempfehlung_vorlage.pdf")
pdf_temp = os.path.join(base_dir, "../../data/temp_tagesempfehlung.pdf")
pdf_output = os.path.join(base_dir, f"../../frontend/public/data/{day}.pdf")

# Schriftarten registrieren
pdfmetrics.registerFont(TTFont("FiraSans", os.path.join(base_dir, "../../frontend/public/resources/fonts/FiraSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont("FiraSansMedium", os.path.join(base_dir, "../../frontend/public/resources/fonts/FiraSans-Medium.ttf")))
pdfmetrics.registerFont(TTFont("FiraSansItalic", os.path.join(base_dir, "../../frontend/public/resources/fonts/FiraSans-Italic.ttf")))

# Farben definieren
dunkelrot = Color(159/255, 28/255, 12/255)
hellgruen = Color(0/255, 176/255, 80/255)
schwarz = Color(0, 0, 0)

# Positionen für jede Spalte (feste X/Y-Koordinaten)
positions = {
    "Date": (82, 517),
    "Daily main": (82, 454),
    "Daily side": (82, 430),
    "DailyHalalVeggi": (250, 487),
    "Daily price": (82, 400),
    "Soup main": (82, 336),
    "SoupHalalVeggi": (195, 367),
    "Soup price": (82, 305)
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
    c.setFont("FiraSansMedium", 19)
    c.setFillColor(dunkelrot)
    c.drawString(x, y, row["date_title"])

    # Tagesempfehlung Hauptgericht fett/schwarz
    x, y = positions["Daily main"]
    c.setFont("FiraSansMedium", 20)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["daily_main"])

    # Tagesempfehlung Beilage schwarz
    x, y = positions["Daily side"]
    c.setFont("FiraSans", 20)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["daily_side"])

    # Tagessuppe Hauptgericht fett/schwarz
    x, y = positions["Soup main"]
    c.setFont("FiraSansMedium", 20)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["daily_soup"])

    # Tagesgericht Preis kursiv/schwarz
    x, y = positions["Daily price"]
    c.setFont("FiraSansItalic", 13)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["daily_price"])

    # Tagessuppe Preis kursiv/schwarz
    x, y = positions["Soup price"]
    c.setFont("FiraSansItalic", 13)
    c.setFillColor(schwarz)
    c.drawString(x, y, row["soup_price"])

    if row["daily_halal"]:
        x, y = positions["DailyHalalVeggi"]
        c.setFont("FiraSansMedium", 20)
        c.setFillColor(hellgruen)
        c.drawString(x, y, '„HALAL“')
    elif row["daily_veggi"]:
        x, y = positions["DailyHalalVeggi"]
        c.setFont("FiraSansMedium", 20)
        c.setFillColor(hellgruen)
        c.drawString(x, y, '„veggi“')
    if row["soup_halal"]:
        x, y = positions["SoupHalalVeggi"]
        c.setFont("FiraSansMedium", 20)
        c.setFillColor(hellgruen)
        c.drawString(x, y, '„HALAL“')
    elif row["soup_veggi"]:
        x, y = positions["SoupHalalVeggi"]
        c.setFont("FiraSansMedium", 20)
        c.setFillColor(hellgruen)
        c.drawString(x, y, '„veggi“')

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