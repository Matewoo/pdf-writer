import os
import json
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import Color
from PyPDF2 import PdfReader, PdfWriter
import sqlite3
import sys

# Argumente einlesen - nur noch die Woche wird als Argument erwartet
if len(sys.argv) != 2:
    print("Usage: python writeWeeklyMenuEN.py <week>")
    sys.exit(1)

week = sys.argv[1].replace("-", " ")
print(f"Week parameter: {week}")  # Debugging-Ausgabe

base_dir = os.path.dirname(os.path.abspath(__file__))

# Lade die Übersetzungen aus der temporären JSON-Datei
temp_json_path = os.path.join(base_dir, '../temp_translations.json')
try:
    with open(temp_json_path, 'r', encoding='utf-8') as json_file:
        ai_translations = json.load(json_file)
    print(f"Successfully loaded {len(ai_translations)} translations from temp file")
except Exception as e:
    print(f"Error loading AI translations from file: {e}")
    ai_translations = []
    sys.exit(1)

# Datenbankverbindung herstellen
db_path = os.path.join(base_dir, "../../../pdf-writer-data/menu.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Daten aus der Datenbank laden
query = "SELECT * FROM menu_entries WHERE week = ?"
df = pd.read_sql_query(query, conn, params=(week,))

# NaN-Werte durch leere Strings ersetzen
df = df.fillna("")

# Dateien einlesen
pdf_template = os.path.join(base_dir, "../../data/speiseplan_vorlage_en.pdf")
pdf_temp = os.path.join(base_dir, "../../data/temp_speiseplan_en.pdf")
pdf_output = os.path.join(base_dir, f"../../frontend/public/data/{week}_EN.pdf")

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
    "Date": (82, 587),
    "Meat main dish": (82, 539),
    "Meat side dish": (82, 524),
    "Halal": (186, 566),
    "Meat price": (82, 500),
    "Veggi main dish": (82, 451),
    "Veggi side dish": (82, 436),
    "Veggi price": (82, 408)
}

# PDF erstellen
c = canvas.Canvas(pdf_temp, pagesize=A4)

erste_seite = True  # Flag, um sicherzustellen, dass nicht direkt umgeblättert wird

# AI translation index counter
ai_index = 0

for _, row in df.iterrows():
    if not erste_seite:
        c.showPage()  # Neue Seite NUR NACH dem ersten Eintrag
    else:
        erste_seite = False  # Nach der ersten Iteration abschalten

    # Wochentag & Datum fett/rot setzen
    x, y = positions["Date"]
    c.setFont("FiraSansMedium", 14)
    c.setFillColor(dunkelrot)
    c.drawString(x, y, row["date_title"])

    # Get translations for meat meal if available
    meat_main_en = ""
    meat_side_en = ""
    if ai_index < len(ai_translations):
        meat_main_en = ai_translations[ai_index].get('main_course', '')
        meat_side_en = ai_translations[ai_index].get('side_dish', '')
        ai_index += 1

    # Fleischgericht Hauptgericht fett/schwarz
    x, y = positions["Meat main dish"]
    c.setFont("FiraSansMedium", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, meat_main_en)

    # Fleischgericht Beilage fett/schwarz
    x, y = positions["Meat side dish"]
    c.setFont("FiraSans", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, meat_side_en)

    # Get translations for veggie meal if available
    veggi_main_en = ""
    veggi_side_en = ""
    if ai_index < len(ai_translations):
        veggi_main_en = ai_translations[ai_index].get('main_course', '')
        veggi_side_en = ai_translations[ai_index].get('side_dish', '')
        ai_index += 1

    # Veggi Hauptgericht fett/schwarz
    x, y = positions["Veggi main dish"]
    c.setFont("FiraSansMedium", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, veggi_main_en)

    # Veggi Beilage fett/schwarz
    x, y = positions["Veggi side dish"]
    c.setFont("FiraSans", 12)
    c.setFillColor(schwarz)
    c.drawString(x, y, veggi_side_en)

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
        c.drawString(x, y, '„HALAL"')

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