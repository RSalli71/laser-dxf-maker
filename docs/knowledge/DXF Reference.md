# AutoCAD Release 12 — DXF Reference

> **Quelle:** Autodesk, Inc. © 1993 | **Format:** ASCII / Binary Drawing Interchange  
> **Zweck:** Vollständige Referenz für das DXF-Dateiformat (Drawing Interchange Format)  
> **Zielgruppe:** Entwickler, die DXF-Dateien lesen, schreiben oder verarbeiten

---

## Inhaltsverzeichnis

1. [Übersicht](#1-übersicht)
2. [DXF-Dateistruktur](#2-dxf-dateistruktur)
3. [Group Codes (Gruppencodes)](#3-group-codes-gruppencodes)
4. [Datei-Sektionen](#4-datei-sektionen)
5. [HEADER-Sektion — Systemvariablen](#5-header-sektion--systemvariablen)
6. [TABLES-Sektion](#6-tables-sektion)
7. [BLOCKS-Sektion](#7-blocks-sektion)
8. [ENTITIES-Sektion — Alle Entitäten](#8-entities-sektion--alle-entitäten)
9. [Entity Coordinate Systems (ECS)](#9-entity-coordinate-systems-ecs)
10. [Arbitrary Axis Algorithm](#10-arbitrary-axis-algorithm)
11. [Extended Entity Data (XDATA)](#11-extended-entity-data-xdata)
12. [DXF-Programme schreiben](#12-dxf-programme-schreiben)
13. [Binäres DXF-Format](#13-binäres-dxf-format)
14. [DXB-Format (Binary Drawing Interchange)](#14-dxb-format-binary-drawing-interchange)
15. [Anhang: Group Code Übersicht](#15-anhang-group-code-übersicht)

---

## 1. Übersicht

### Was ist DXF?

Das **Drawing Interchange Format (DXF)** ermöglicht den Datenaustausch von AutoCAD-Zeichnungen mit anderen Programmen. Alle AutoCAD-Implementierungen unterstützen dieses Format.

| Eigenschaft | Beschreibung |
|---|---|
| Dateityp | `.dxf` |
| Encoding | ASCII-Text (oder binär) |
| Lesbarkeit | Von Menschen und Programmen lesbar |
| Kompatibilität | Alle AutoCAD-Versionen ab R10 |

> ⚠️ **Hinweis:** Das native `.dwg`-Format sollte **nicht** programmatisch gelesen werden, da es sich mit neuen Features erheblich ändern kann.

---

## 2. DXF-Dateistruktur

### Generelle Dateiorganisation

Eine DXF-Datei besteht aus **5 Hauptbereichen** in dieser festen Reihenfolge:

```
┌─────────────────────────────────────┐
│  1. HEADER   — Zeichnungsparameter  │
│  2. TABLES   — Benannte Objekte     │
│  3. BLOCKS   — Block-Definitionen   │
│  4. ENTITIES — Zeichnungsobjekte    │
│  5. EOF      — Dateiende-Marker     │
└─────────────────────────────────────┘
```

### Aufbau jeder Gruppe (Group)

Jede Gruppe belegt **genau zwei Zeilen**:

```
<Gruppencode>    ← Zeile 1: positiver, nicht-null Integer
<Gruppenwert>    ← Zeile 2: Wert (abhängig vom Typ)
```

**Beispiel:**
```
  0
SECTION
  2
HEADER
```

### Wertetypen nach Gruppencode-Bereich

| Gruppencode-Bereich | Werttyp |
|---|---|
| 0 – 9 | String |
| 10 – 59 | Floating-point |
| 60 – 79 | Integer |
| 140 – 147 | Floating-point |
| 170 – 175 | Integer |
| 210 – 239 | Floating-point |
| 999 | Kommentar (String) |
| 1000 – 1009 | String (Extended Data) |
| 1010 – 1059 | Floating-point (Extended Data) |
| 1060 – 1079 | Integer (Extended Data) |

> 📌 **Koordinaten:** Immer als Dezimalzahlen (oder wissenschaftliche Notation). Winkel in Dezimalgrad (0° = Osten).

---

## 3. Group Codes (Gruppencodes)

### Standardcodes für alle Entitäten

| Code | Werttyp | Bedeutung |
|---|---|---|
| `0` | String | Start einer Entität, Tabelle oder Datei-Separator |
| `1` | String | Primärer Textwert der Entität |
| `2` | String | Name (Attribut-Tag, Block-Name, Sektion, Tabelle) |
| `3–4` | String | Weitere Text-/Namenswerte |
| `5` | String (Hex) | Entity-Handle (**fest**) |
| `6` | String | Linientyp-Name (**fest**) |
| `7` | String | Text-Stil-Name (**fest**) |
| `8` | String | Layer-Name (**fest**) |
| `9` | String | Variablenname (nur HEADER) |
| `10` | Float | Primäre X-Koordinate |
| `11–18` | Float | Weitere X-Koordinaten |
| `20` | Float | Primäre Y-Koordinate |
| `21–28` | Float | Weitere Y-Koordinaten |
| `30` | Float | Primäre Z-Koordinate |
| `31–37` | Float | Weitere Z-Koordinaten |
| `38` | Float | Elevation (nur vor R11) |
| `39` | Float | Dicke/Thickness (**fest**) |
| `40–48` | Float | Gleitkommawerte (Texthöhe, Skalierung usw.) |
| `49` | Float | Wiederholter Wert (variable Tabellenlängen) |
| `50–58` | Float | Winkel |
| `62` | Integer | Farbnummer (**fest**) |
| `66` | Integer | „Entities follow"-Flag (**fest**) |
| `67` | Integer | Modell- oder Papierraum |
| `68` | Integer | Viewport-Status |
| `69` | Integer | Viewport-ID |
| `70–78` | Integer | Integer-Werte (Flags, Modi, Zähler) |
| `210, 220, 230` | Float | Extrusions-Richtung X, Y, Z (**fest**) |
| `999` | String | Kommentar |

### Extended Entity Data Codes

| Code | Bedeutung |
|---|---|
| `1000` | ASCII-String (max. 255 Bytes) |
| `1001` | Registrierter Applikationsname (max. 31 Bytes) (**fest**) |
| `1002` | Kontroll-String (`{` oder `}`) (**fest**) |
| `1003` | Layer-Name |
| `1004` | Byte-Chunk (max. 127 Bytes) |
| `1005` | Datenbank-Handle |
| `1010/1020/1030` | X, Y, Z-Koordinaten |
| `1011/1021/1031` | 3D World Space Position |
| `1012/1022/1032` | 3D World Space Displacement |
| `1013/1023/1033` | 3D World Space Direction |
| `1040` | Floating-point-Wert |
| `1041` | Distanz-Wert |
| `1042` | Skalierungsfaktor |
| `1070` | 16-Bit-Integer (signed) |
| `1071` | 32-Bit-Long (signed) |

### Kommentare (Code 999)

```
999
Dies ist ein Kommentar.
999
Dies ist ein weiterer Kommentar.
```

> `DXFOUT` schreibt keine 999-Gruppen. `DXFIN` liest und ignoriert sie.

---

## 4. Datei-Sektionen

### Vorlage einer leeren DXF-Datei

```
  0
SECTION
  2
HEADER
<<<< Header-Variablen hier >>>>
  0
ENDSEC

  0
SECTION
  2
TABLES
  0
TABLE
  2
VPORT
 70
<max. Anzahl Einträge>
<<<< Viewport-Tabelleneinträge hier >>>>
  0
ENDTAB
  0
ENDSEC

  0
SECTION
  2
BLOCKS
<<<< Block-Definitionen hier >>>>
  0
ENDSEC

  0
SECTION
  2
ENTITIES
<<<< Zeichnungsobjekte hier >>>>
  0
ENDSEC

  0
EOF
```

> ⚠️ Der `EOF`-Marker am Dateiende ist **Pflicht**.

---

## 5. HEADER-Sektion — Systemvariablen

Jede Variable wird mit Gruppencode `9` (Variablenname) eingeleitet, gefolgt vom Wert.

### Zeichnungsversion

| Variable | Typ | Beschreibung |
|---|---|---|
| `$ACADVER` | 1 | DB-Version: `AC1006`=R10, `AC1009`=R11/R12 |

### Winkel & Einheiten

| Variable | Typ | Beschreibung |
|---|---|---|
| `$ANGBASE` | 50 | Richtung Winkel 0 |
| `$ANGDIR` | 70 | `1`=Uhrzeigersinn, `0`=Gegenuhrzeigersinn |
| `$AUNITS` | 70 | Winkel-Einheitenformat |
| `$AUPREC` | 70 | Winkel-Genauigkeit |
| `$LUNITS` | 70 | Koordinaten-/Distanzformat |
| `$LUPREC` | 70 | Koordinaten-Genauigkeit |
| `$UNITMODE` | 70 | Anzeigeformat (Brüche, Fuß/Zoll) |

### Layer & Farbe

| Variable | Typ | Beschreibung |
|---|---|---|
| `$CLAYER` | 8 | Aktueller Layer-Name |
| `$CECOLOR` | 62 | Farbnummer: `0`=BYBLOCK, `256`=BYLAYER |
| `$CELTYPE` | 6 | Linientyp: BYBLOCK oder BYLAYER |

### Zeichnungsgrenzen & Extents

| Variable | Typ | Beschreibung |
|---|---|---|
| `$EXTMIN` | 10,20,30 | Untere linke Ecke (WCS) |
| `$EXTMAX` | 10,20,30 | Obere rechte Ecke (WCS) |
| `$LIMMIN` | 10,20 | XY Grenzlinie unten links (WCS) |
| `$LIMMAX` | 10,20 | XY Grenzlinie oben rechts (WCS) |
| `$LIMCHECK` | 70 | Grenzprüfung aktiv wenn ≠ 0 |

### Textstil & Bemaßung

| Variable | Typ | Beschreibung |
|---|---|---|
| `$TEXTSIZE` | 40 | Standard-Texthöhe |
| `$TEXTSTYLE` | 7 | Aktueller Textstil |
| `$DIMSCALE` | 40 | Gesamtskalierung Bemaßung |
| `$DIMASZ` | 40 | Pfeilgröße Bemaßung |
| `$DIMTXT` | 40 | Texthöhe Bemaßung |
| `$DIMSTYLE` | 2 | Bemaßungsstil-Name |

### Zeichnungszeiten

| Variable | Typ | Format |
|---|---|---|
| `$TDCREATE` | 40 | `<Julianisches Datum>.<Fraktion>` |
| `$TDUPDATE` | 40 | `<Julianisches Datum>.<Fraktion>` |
| `$TDINDWG` | 40 | `<Tage>.<Fraktion>` |
| `$TDUSRTIMER` | 40 | `<Tage>.<Fraktion>` |

### Sonstige wichtige Variablen

| Variable | Typ | Beschreibung |
|---|---|---|
| `$FILLMODE` | 70 | Füllmodus aktiv wenn ≠ 0 |
| `$ORTHOMODE` | 70 | Ortho-Modus aktiv wenn ≠ 0 |
| `$OSMODE` | 70 | Laufende Objekt-Snap-Modi |
| `$TILEMODE` | 70 | `1`=Kompatibilitätsmodus, `0`=sonst |
| `$INSBASE` | 10,20,30 | Einfüge-Basispunkt (WCS) |
| `$HANDLING` | 70 | Handles aktiv wenn ≠ 0 |
| `$HANDSEED` | 5 | Nächster verfügbarer Handle |
| `$MENU` | 1 | Menü-Dateiname |
| `$DWGCODEPAGE` | 3 | Zeichnungs-Codepage |

---

## 6. TABLES-Sektion

### Tabellenstruktur

```
  0
TABLE
  2
<TABELLENNAME>
 70
<max. Eintragsanzahl>
<<<< Tabelleneinträge >>>>
  0
ENDTAB
```

> ⚠️ Nicht die Zahl aus Gruppe `70` als Zählindex verwenden — es kann weniger Einträge geben. Array-Allokation für max. Größe verwenden.

### Reihenfolge der Tabellen

- Die `LTYPE`-Tabelle muss **vor** der `LAYER`-Tabelle erscheinen.
- Sonst ist die Reihenfolge variabel.

### Globale Flags (Gruppe 70) für alle Tabellen

| Bit-Wert | Bedeutung |
|---|---|
| `16` | Eintrag ist extern abhängig (Xref) |
| `32` | Xref wurde erfolgreich aufgelöst (nur mit Bit 16) |
| `64` | Eintrag wurde von mind. einer Entität referenziert |

### APPID — Applikationsname

| Code | Bedeutung |
|---|---|
| `2` | Applikationsname (vom Benutzer) |
| `70` | Standard-Flags |

### LTYPE — Linientyp

| Code | Bedeutung |
|---|---|
| `2` | Linientyp-Name |
| `70` | Standard-Flags |
| `3` | Beschreibungstext |
| `72` | Ausrichtungscode (immer `65` = ASCII `A`) |
| `73` | Anzahl der Strichlängen-Elemente |
| `40` | Gesamtmusterlänge |
| `49` | Strichlänge (wiederholbar) |

### LAYER — Layer

| Code | Bedeutung |
|---|---|
| `2` | Layer-Name |
| `70` | Layer-Flags (siehe Tabelle unten) |
| `62` | Farbnummer (negativ = Layer ausgeschaltet) |
| `6` | Linientyp-Name |

**Layer-Flags (Gruppe 70):**

| Bit-Wert | Bedeutung |
|---|---|
| `1` | Layer ist eingefroren |
| `2` | Layer in neuen Viewports eingefroren |
| `4` | Layer ist gesperrt |
| `0` | Layer ist an und aufgetaut |

### STYLE — Textstil

| Code | Bedeutung |
|---|---|
| `2` | Stilname |
| `70` | Flags: Bit `1`=Shape-Datei, Bit `4`=vertikal |
| `40` | Fixe Texthöhe (`0`=variabel) |
| `41` | Breitenfaktor |
| `50` | Neigungswinkel |
| `71` | Textgenerierungsflags: `2`=rückwärts, `4`=auf dem Kopf |
| `42` | Zuletzt verwendete Höhe |
| `3` | Primärer Font-Dateiname |
| `4` | Big-Font-Dateiname (leer wenn keiner) |

### UCS — User Coordinate System

| Code | Bedeutung |
|---|---|
| `2` | UCS-Name |
| `70` | Standard-Flags |
| `10,20,30` | Ursprung (in WCS) |
| `11,21,31` | X-Achsen-Richtung (in WCS) |
| `12,22,32` | Y-Achsen-Richtung (in WCS) |

### VIEW — Ansicht

| Code | Bedeutung |
|---|---|
| `2` | Ansichtsname |
| `70` | Flags: Bit `1` = Papierraum-Ansicht |
| `40` | Höhe (in DCS) |
| `41` | Breite (in DCS) |
| `10,20` | Mittelpunkt (in DCS) |
| `11,21,31` | Blickrichtung vom Ziel (in WCS) |
| `12,22,32` | Zielpunkt (in WCS) |
| `42` | Objektivlänge |
| `43` | Vordere Schnittebene (Offset vom Ziel) |
| `44` | Hintere Schnittebene (Offset vom Ziel) |
| `50` | Twist-Winkel |
| `71` | Ansichtsmodus (wie VIEWMODE-Systemvariable) |

### VPORT — Viewport-Konfiguration

| Code | Bedeutung |
|---|---|
| `2` | Viewport-Name (`*ACTIVE` für aktive Viewports) |
| `70` | Standard-Flags |
| `10,20` | Untere linke Ecke (0.0–1.0) |
| `11,21` | Obere rechte Ecke |
| `12,22` | Ansichtsmittelpunkt (DCS) |
| `40` | Ansichtshöhe |
| `41` | Seitenverhältnis |
| `42` | Objektivlänge |
| `50` | Snap-Drehwinkel |
| `51` | Ansichts-Twist-Winkel |
| `71–78` | Modi (Ansicht, Zoom, UCS-Icon, Snap, Grid usw.) |

> 📌 Die VPORT-Tabelle kann **mehrere Einträge mit gleichem Namen** haben (Mehrfach-Viewport-Konfiguration). Alle aktiven Viewports heißen `*ACTIVE`; der erste beschreibt den aktuellen.

### DIMSTYLE — Bemaßungsstil

Enthält alle Bemaßungsvariablen als Gruppe-Codes:

| Codes | Variablen |
|---|---|
| `3,4,5,6,7` | dimpost, dimapost, dimblk, dimblk1, dimblk2 |
| `40–48` | dimscale, dimasz, dimexo, dimdli, dimexe, dimrnd, dimdle, dimtp, dimtm |
| `140–147` | dimtxt, dimcen, dimtsz, dimaltf, dimlfac, dimtvp, dimtfac, dimgap |
| `71–78` | dimtol, dimlim, dimtih, dimtoh, dimse1, dimse2, dimtad, dimzin |
| `170–178` | dimalt, dimaltd, dimtofl, dimsah, dimtix, dimsoxd, dimclrd, dimclre, dimclrt |

---

## 7. BLOCKS-Sektion

- Enthält alle **Block-Definitionen** der Zeichnung (inkl. Schraffur- und Bemaßungs-Blöcke).
- Format identisch mit ENTITIES-Sektion.
- Alle Entitäten stehen zwischen `BLOCK`- und `ENDBLK`-Entitäten.
- Block-Definitionen sind **nicht verschachtelt** (aber können INSERT-Entitäten enthalten).

**Xref-Blöcke** enthalten zusätzlich Gruppe `1` mit dem Pfad/Dateinamen:
```
1
Xref-Dateiname
```

---

## 8. ENTITIES-Sektion — Alle Entitäten

### Gemeinsame Codes für alle Entitäten

| Code | Bedeutung | Standard |
|---|---|---|
| `6` | Linientyp (wenn nicht BYLAYER) | BYLAYER |
| `38` | Elevation (nur vor R11) | 0 |
| `39` | Thickness/Dicke | 0 |
| `62` | Farbnummer (wenn nicht BYLAYER) | BYLAYER |
| `67` | `0`=Modellraum, `1`=Papierraum | 0 |
| `210,220,230` | Extrusions-Richtung X,Y,Z | 0,0,1 |

> ⚠️ Reihenfolge der Gruppen **nicht** festgelegt — immer tabellengesteuert lesen!

---

### LINE

```
Codes:  10,20,30  → Startpunkt
        11,21,31  → Endpunkt
```

---

### POINT

```
Codes:  10,20,30  → Punkt
        50        → (optional) Winkel der X-Achse des UCS beim Zeichnen
```

---

### CIRCLE

```
Codes:  10,20,30  → Mittelpunkt
        40        → Radius
```

---

### ARC

```
Codes:  10,20,30  → Mittelpunkt
        40        → Radius
        50        → Startwinkel
        51        → Endwinkel
```

---

### TRACE

```
Codes:  10,20,30  → Ecke 1
        11,21,31  → Ecke 2
        12,22,32  → Ecke 3
        13,23,33  → Ecke 4
```

---

### SOLID

```
Codes:  10,20,30  → Ecke 1
        11,21,31  → Ecke 2
        12,22,32  → Ecke 3
        13,23,33  → Ecke 4 (= Ecke 3 bei Dreieck)
```

---

### TEXT

```
Codes:  10,20,30  → Einfügepunkt
        40        → Höhe
        1         → Textwert (String)
        50        → Drehwinkel (optional, Standard: 0)
        41        → Relativer X-Skalierungsfaktor (optional, Standard: 1)
        51        → Neigungswinkel (optional, Standard: 0)
        7         → Textstil-Name (optional, Standard: STANDARD)
        71        → Textgenerierungsflags (optional, Standard: 0)
        72        → Horizontale Ausrichtung (optional, Standard: 0)
        73        → Vertikale Ausrichtung (optional, Standard: 0)
        11,21,31  → Ausrichtungspunkt (optional, nur wenn 72/73 ≠ 0)
```

**Textgenerierungsflags (Code 71):**

| Bit | Bedeutung |
|---|---|
| `2` | Rückwärts (gespiegelt in X) |
| `4` | Auf dem Kopf (gespiegelt in Y) |

**Horizontale Ausrichtung (Code 72) — Integer, nicht Bit-kodiert:**

| Wert | Bedeutung |
|---|---|
| `0` | Links |
| `1` | Mitte |
| `2` | Rechts |
| `3` | Ausgerichtet (wenn Gruppe 73 = 0) |
| `4` | Mittig (wenn Gruppe 73 = 0) |
| `5` | Gefüllt (wenn Gruppe 73 = 0) |

**Vertikale Ausrichtung (Code 73) — Integer, nicht Bit-kodiert:**

| Wert | Bedeutung |
|---|---|
| `0` | Baseline |
| `1` | Unten |
| `2` | Mitte |
| `3` | Oben |

---

### SHAPE

```
Codes:  10,20,30  → Einfügepunkt
        40        → Größe
        2         → Shape-Name
        50        → Drehwinkel (optional, Standard: 0)
        41        → Relativer X-Skalierungsfaktor (optional, Standard: 1)
        51        → Neigungswinkel (optional, Standard: 0)
```

---

### BLOCK

```
Codes:  2         → Block-Name
        3         → Block-Name (identisch zu 2)
        70        → Block-Typ-Flag (Bit-kodiert)
        10,20,30  → Block-Basispunkt
        1         → Xref-Pfadname (optional, nur bei Xref-Blöcken)
```

**Block-Typ-Flags (Code 70):**

| Bit | Bedeutung |
|---|---|
| `1` | Anonymer Block (Schraffur, Bemaßung, intern) |
| `2` | Block hat Attribute |
| `4` | Externer Referenz-Block (Xref) |
| `16` | Block ist extern abhängig |
| `32` | Aufgelöste externe Referenz |
| `64` | Definition wird referenziert |

---

### INSERT

```
Codes:  66        → Attributes-follow-Flag (optional, Standard: 0)
        2         → Block-Name
        10,20,30  → Einfügepunkt
        41        → X-Skalierung (optional, Standard: 1)
        42        → Y-Skalierung (optional, Standard: 1)
        43        → Z-Skalierung (optional, Standard: 1)
        50        → Drehwinkel (optional, Standard: 0)
        70        → Spaltenanzahl (optional, Standard: 1)
        71        → Zeilenanzahl (optional, Standard: 1)
        44        → Spaltenabstand (optional, Standard: 0)
        45        → Zeilenabstand (optional, Standard: 0)
```

> Wenn `66` = 1: Es folgen ATTRIB-Entitäten, abgeschlossen durch SEQEND.

---

### ATTDEF

```
Codes:  10,20,30  → Textstartpunkt
        40        → Texthöhe
        1         → Standardwert
        3         → Eingabeaufforderung
        2         → Tag-String
        70        → Attribut-Flags
        73        → Feldlänge (optional, Standard: 0)
        50        → Textdrehung (optional, Standard: 0)
        41        → Relativer X-Skalierungsfaktor (optional, Standard: 1)
        51        → Neigungswinkel (optional, Standard: 0)
        7         → Textstilname (optional, Standard: STANDARD)
        71        → Textgenerierungsflags
        72        → Horizontale Ausrichtung
        74        → Vertikale Ausrichtung
        11,21,31  → Ausrichtungspunkt (optional)
```

**Attribut-Flags (Code 70):**

| Bit | Bedeutung |
|---|---|
| `1` | Attribut unsichtbar |
| `2` | Konstantes Attribut |
| `4` | Überprüfung bei Eingabe erforderlich |
| `8` | Voreingestellt (keine Eingabeaufforderung) |

---

### ATTRIB

Identisch zu ATTDEF, außer:
- Code `1` = Wert (statt Standardwert)
- Code `2` = Attribut-Tag (statt Prompt)

---

### POLYLINE

```
Codes:  66        → Vertices-follow-Flag (immer 1)
        10,20,30  → Dummy-Punkt (X=0, Y=0, Z=Elevation)
        70        → Polylinien-Flag (optional, Standard: 0)
        40        → Standard-Startbreite (optional, Standard: 0)
        41        → Standard-Endbreite (optional, Standard: 0)
        71,72     → Polygon-Mesh M- und N-Vertex-Anzahl
        73,74     → Glatte Oberfläche M- und N-Dichten
        75        → Kurven-/Glattflächentyp
```

**Polylinien-Flags (Code 70):**

| Bit | Bedeutung |
|---|---|
| `1` | Geschlossene Polylinie |
| `2` | Curve-fit-Vertices hinzugefügt |
| `4` | Spline-fit-Vertices hinzugefügt |
| `8` | 3D-Polylinie |
| `16` | 3D-Polygon-Mesh |
| `32` | Mesh in N-Richtung geschlossen |
| `64` | Polyface-Mesh |
| `128` | Linientyp-Muster kontinuierlich um Vertices |

**Kurventypen (Code 75):**

| Wert | Bedeutung |
|---|---|
| `0` | Keine glatte Oberfläche |
| `5` | Quadratischer B-Spline |
| `6` | Kubischer B-Spline |
| `8` | Bezier-Oberfläche |

---

### VERTEX

```
Codes:  10,20,30  → Position
        40        → Startbreite (optional, Standard: 0)
        41        → Endbreite (optional, Standard: 0)
        42        → Bulge (optional, Standard: 0)
        70        → Vertex-Flags (optional, Standard: 0)
        50        → Curve-fit-Tangenten-Richtung (optional)
```

> **Bulge-Wert:** Tangens von 1/4 des eingeschlossenen Winkels (negativ = Bogen im Uhrzeigersinn). `0` = gerades Segment, `1` = Halbkreis.

**Vertex-Flags (Code 70):**

| Bit | Bedeutung |
|---|---|
| `1` | Extra-Vertex durch Curve-fitting |
| `2` | Curve-fit-Tangente definiert |
| `8` | Spline-Vertex durch Spline-fitting |
| `16` | Spline-Frame-Kontrollpunkt |
| `32` | 3D-Polylinien-Vertex |
| `64` | 3D-Polygon-Mesh-Vertex |
| `128` | Polyface-Mesh-Vertex |

---

### SEQEND

Keine Codes. Markiert das Ende von:
- VERTEX-Entitäten einer POLYLINE
- ATTRIB-Entitäten einer INSERT-Entität (wenn `66` ≠ 0)

---

### 3DFACE

```
Codes:  10,20,30  → Ecke 1
        11,21,31  → Ecke 2
        12,22,32  → Ecke 3
        13,23,33  → Ecke 4 (= Ecke 3 bei Dreieck)
        70        → Unsichtbare Kanten-Flags (optional, Standard: 0)
```

**Unsichtbare Kanten (Code 70):**

| Bit | Bedeutung |
|---|---|
| `1` | Erste Kante unsichtbar |
| `2` | Zweite Kante unsichtbar |
| `4` | Dritte Kante unsichtbar |
| `8` | Vierte Kante unsichtbar |

---

### VIEWPORT

```
Codes:  10,20,30  → Mittelpunkt (in Papierraum-Koordinaten)
        40        → Breite (Papierraum-Einheiten)
        41        → Höhe (Papierraum-Einheiten)
        68        → Viewport-Status-Feld
        69        → Viewport-ID (Papierraum-Viewport = immer 1)
```

**Status-Feld (Code 68):**

| Wert | Bedeutung |
|---|---|
| `-1` | An, aber vollständig außerhalb des Bildschirms |
| `0` | Aus |
| `>0` | An und aktiv; Wert = Stapelreihenfolge (1 = aktiv/oben) |

---

### DIMENSION

```
Codes:  2         → Name des Pseudo-Blocks mit Bemaßungsgeometrie
        3         → Bemaßungsstil-Name
        10,20,30  → Definitionspunkt (alle Bemaßungstypen)
        11,21,31  → Mittelpunkt Bemaßungstext (ECS)
        12,22,32  → Bemaßungsblock-Translationsvektor (ECS)
        70        → Bemaßungstyp (Integer-kodiert)
        1         → Vom Benutzer eingegebener Text (optional)
        13,23,33  → Definitionspunkt linear/angular (WCS)
        14,24,34  → Definitionspunkt linear/angular (WCS)
        15,25,35  → Definitionspunkt Durchmesser/Radius/angular (WCS)
        16,26,36  → Punkt für Bemaßungsbogen bei angular (ECS)
        40        → Führungslänge bei Radius/Durchmesser
        50        → Winkel bei gedrehten/horizontalen/vertikalen Bemaßungen
        51        → Horizontale Richtung (optional)
        52        → Erweiterungslinienwinkel bei schiefen Bemaßungen (optional)
        53        → Textdrehwinkel (optional)
```

**Bemaßungstypen (Code 70) — Integer, nicht Bit-kodiert:**

| Wert | Bedeutung |
|---|---|
| `0` | Gedreht, horizontal oder vertikal |
| `1` | Ausgerichtet |
| `2` | Angular (2-Linien) |
| `3` | Durchmesser |
| `4` | Radius |
| `5` | Angular (3-Punkt) |
| `6` | Ordinate |
| `64` | Ordinate X-Typ (Bit 7) |
| `128` | Text an benutzerdef. Position (Bit 8, add. zu 0–6) |

**Punkt-Bedeutungen nach Bemaßungstyp:**

| Typ | Punkte |
|---|---|
| **Linear** | `(13,23,33)` 1. Erweiterungs­linie; `(14,24,34)` 2. Erweiterungs­linie; `(10,20,30)` Bemaßungslinie |
| **Angular** | `(13,23,33)+(14,24,34)` 1. Erweiterungs­linie; `(10,20,30)+(15,25,35)` 2. Erweiterungs­linie; `(16,26,36)` Bogenende |
| **Angular 3-Punkt** | `(15,25,35)` Scheitelpunkt; `(13,23,33)` 1. Erweiterungs­linie; `(14,24,34)` 2. Erweiterungs­linie |
| **Durchmesser** | `(15,25,35)` Auswahlpunkt; `(10,20,30)` gegenüberliegender Punkt |
| **Radius** | `(15,25,35)` Auswahlpunkt; `(10,20,30)` Mittelpunkt |
| **Ordinate** | `(13,23,33)` Feature-Punkt; `(14,24,34)` Führungsendpunkt |

---

## 9. Entity Coordinate Systems (ECS)

### Konzept

Um Datenbankplatz zu sparen, werden Entitätspunkte im **eigenen Koordinatensystem (ECS)** der Entität gespeichert. Zusätzlich benötigt werden:
- 3D-Vektor der Z-Achse des ECS
- Elevation-Wert

### ECS-Eigenschaften

- Ursprung liegt im WCS-Ursprung
- X- und Y-Achsen werden durch den **Arbitrary Axis Algorithm** berechnet

### Koordinatensysteme nach Entitätstyp

| Entitäten | Koordinatensystem |
|---|---|
| Line, Point, 3D Face, 3D Polyline, 3D Vertex, 3D Mesh, 3D Mesh-Vertex | **World Coordinates (WCS)** — keine bestimmte Ebene |
| Circle, Arc, Solid, Trace, Text, Attrib, Attdef, Shape, Insert, 2D Polyline, 2D Vertex | **Entity Coordinates (ECS)** — planar |
| Dimension | Gemischt: einige WCS, einige ECS |
| Viewport | World Coordinates |

### Wichtige Konsequenzen

- Es ist nicht zuverlässig möglich, das beim Zeichnen aktive UCS herauszufinden.
- XY-Koordinaten in DXF entsprechen **nicht** den Eingabekoordinaten im UCS.
- Elevation = Differenz UCS-XY-Ebene zu ECS-XY-Ebene + Benutzerelevation.

---

## 10. Arbitrary Axis Algorithm

### Zweck

Erzeugt konsistent und deterministisch eine X-Achse zu einem gegebenen Z-Achsen-Vektor.

### Algorithmus (Pseudocode)

```
Sei N = gegebener Normalvektor (Z-Achse)
Sei Wy = (0,1,0)   ← World Y-Achse
Sei Wz = (0,0,1)   ← World Z-Achse
Grenzwert = 1/64

WENN (|Nx| < 1/64) UND (|Ny| < 1/64) DANN
    Ax = Wy × N      ← Kreuzprodukt
SONST
    Ax = Wz × N

Ax = normalisiert(Ax)
Ay = N × Ax
Ay = normalisiert(Ay)
```

> Der Grenzwert 1/64 wurde gewählt, da er exakt in 6 Dezimal- und 6 Binärbruchstellen darstellbar ist — portabel über alle Plattformen.

**Ausnahmen:** Lines, Points, 3D Faces und 3D Polylines verwenden **World Coordinates** direkt.

---

## 11. Extended Entity Data (XDATA)

### Organisation

- Beginnt mit Gruppencode `1001` (Applikationsname)
- Gleiche Gruppencodes können **mehrfach** vorkommen
- **Reihenfolge ist bedeutsam**
- Gruppiert nach registrierten Applikationsnamen (= APPID-Tabellen-Einträge)
- Max. **eine** Datengruppe pro APPID pro Entität

### Unterstützte XDATA-Codes

| Code | Typ | Beschreibung |
|---|---|---|
| `1000` | String | Max. 255 Bytes |
| `1001` | String | Applikationsname, max. 31 Bytes (**fest**) |
| `1002` | String | Kontroll-String `{` oder `}` (Listen-Strukturierung) |
| `1003` | String | Layer-Name |
| `1004` | Bytes | Binärdaten, max. 127 Bytes pro Chunk |
| `1005` | String | Entity-Handle |
| `1010/1020/1030` | Float | 3D-Punkt (X, Y, Z) — wird von AutoCAD nie geändert |
| `1011/1021/1031` | Float | World Space Position — wird mit Eltern-Entität transformiert |
| `1012/1022/1032` | Float | World Space Displacement — skaliert, rotiert, gespiegelt |
| `1013/1023/1033` | Float | World Space Direction — rotiert und gespiegelt |
| `1040` | Float | Reeller Wert |
| `1041` | Float | Distanz-Wert (skaliert mit Eltern-Entität) |
| `1042` | Float | Skalierungsfaktor (skaliert mit Eltern-Entität) |
| `1070` | Integer | 16-Bit-Integer |
| `1071` | Long | 32-Bit-Long |

### XDATA-Beispiel (INSERT-Entität)

```
  0
INSERT
  8
X
  5
5F11
 15
  2
BLOCK_A
 10
0.0
 20
0.0
 30
0.0
1001
AME_SOL
1002
{
1070
     0
1071
1950590
1010
2.54717
1020
2.122642
1030
2.049201
1000
MILD_STEEL
```

---

## 12. DXF-Programme schreiben

### DXF lesen — Empfehlungen

- Programm **tabellengesteuert** aufbauen
- **Undefinierte Gruppen ignorieren**
- **Keine Annahmen über Reihenfolge** der Gruppen machen
- Ende einer Entität = nächste `0`-Gruppe

### DXF schreiben — Mindestanforderungen

| Sektion | Pflicht? |
|---|---|
| HEADER | Optional (kann weggelassen werden) |
| TABLES | Optional (wenn keine Einträge nötig) |
| LTYPE vor LAYER | Pflicht, wenn beide vorhanden |
| BLOCKS | Optional (muss vor ENTITIES stehen, wenn vorhanden) |
| ENTITIES | Pflicht für Zeichnungsobjekte |
| EOF | **Pflicht** |

> Nicht definierte Layer werden automatisch mit Farbe 7 und CONTINUOUS-Linientyp erstellt.

### Beispielprogramm: DXF-Leser (BASIC)

```basic
1000 REM Extract lines from DXF file
1040 LINE INPUT "DXF file name: "; A$
1050 OPEN "i", 1, A$ + ".dxf"

' Suche ENTITIES-Sektion
1090 GOSUB 2000
1100 IF G% <> 0 THEN 1090
1110 IF S$ <> "SECTION" THEN 1090
1120 GOSUB 2000
1160 IF S$ <> "ENTITIES" THEN 1090

' Verarbeite LINEs
1200 GOSUB 2000
1210 IF G% = 0 AND S$ = "ENDSEC" THEN 2200
1220 IF G% = 0 AND S$ = "LINE" THEN GOSUB 1400 : GOTO 1210
1230 GOTO 1200

' LINE-Entität lesen
1430 GOSUB 2000
1440 IF G% = 10 THEN X1 = X : Y1 = Y : Z1 = Z
1450 IF G% = 11 THEN X2 = X : Y2 = Y : Z2 = Z
1460 IF G% = 0 THEN PRINT "Line: (";X1;Y1;Z1;") to (";X2;Y2;Z2;")" : RETURN
1470 GOTO 1430
```

### Beispielprogramm: DXF-Schreiber — Polygon (BASIC)

```basic
1000 REM Polygon generator
1050 PRINT #1, 0  : PRINT #1, "SECTION"
1060 PRINT #1, 2  : PRINT #1, "ENTITIES"
' ... Linien schreiben ...
1380 PRINT #1, 0  : PRINT #1, "ENDSEC"
1400 PRINT #1, 0  : PRINT #1, "EOF"
```

---

## 13. Binäres DXF-Format

### Eigenschaften

| Eigenschaft | Wert |
|---|---|
| Dateiersparnis | ca. 25% kleiner als ASCII-DXF |
| Geschwindigkeit | ca. 5× schneller lesen/schreiben |
| Genauigkeit | Volle Floating-Point-Genauigkeit |
| Kompatibilität | Ab AutoCAD Release 10 |

### Datei-Sentinel (22 Bytes)

```
AutoCAD Binary DXF<CR><LF><SUB><NUL>
```

### Datentypen im binären Format

| Typ | Encoding |
|---|---|
| Gruppencode | 1 Byte (binär) |
| 2-Byte-Integer | Little-Endian |
| Floating-Point | 8-Byte IEEE double, Little-Endian |
| String | ASCII, NUL-terminiert |

### Extended Data im Binärformat

Extended Data Codes werden als `255` (Escape) + 2-Byte Integer + Wert kodiert. Code `1071` belegt 4 Bytes. Code `1004` (Binärdaten): 1-Byte-Länge + Daten.

> `DXFIN` erkennt binäre Dateien automatisch am Sentinel.

---

## 14. DXB-Format (Binary Drawing Interchange)

### Zweck

Vereinfachtes Binärformat für einfache geometrische Eingabe an AutoCAD (über externe Kommandos).

### Datei-Header

```
AutoCAD DXB 1.0 CR LF ^Z NUL   (19 Bytes)
```

### Zahlentypen

| Kürzel | Bedeutung |
|---|---|
| `w` | 16-Bit-Integer, Little-Endian |
| `f` | IEEE 64-Bit Float, Little-Endian |
| `l` | 32-Bit-Integer, Little-Endian |
| `n` | 16-Bit-Integer oder Float (je nach Number Mode) |
| `u` | 32-Bit-Integer (×65536) oder Float |
| `a` | Winkel: Integer in Millionstel Grad oder Float in Grad |

### DXB Record-Typen

| Typ | Code | Daten | Länge (Bytes) |
|---|---|---|---|
| Line | 1 | n-fromx/y, n-tox/y (+Z bei 3D) | 13 |
| Point | 2 | n-x, n-y | 5 |
| Circle | 3 | n-ctrx, n-ctry, n-rad | 7 |
| Arc | 8 | n-ctrx, n-ctry, n-rad, a-start, a-end | 19 |
| Trace | 9 | n-x1/y1/x2/y2/x3/y3/x4/y4 | 17 |
| Solid | 11 | n-x1/y1/x2/y2/x3/y3/x4/y4 | 17 |
| Seqend | 17 | (keine) | 1 |
| Polyline | 19 | w-closureflag | 3 |
| Vertex | 20 | n-x, n-y | 5 |
| 3Dface | 22 | n-x1/y1/z1/x2/y2/z2/x3/y3/z3/x4/y4/z4 | 25 |
| Scale Factor | 128 | f-scalefac | 9 |
| New Layer | 129 | "layername" NUL | variabel |
| Line Extension | 130 | n-tox, n-toy | 5 |
| Trace Extension | 131 | n-x3/y3/x4/y4 | 9 |
| Block Base | 132 | n-bx, n-by | 5 |
| Bulge | 133 | u-2h/d | 5 |
| Width | 134 | n-startw, n-endw | 5 |
| Number Mode | 135 | w-mode | 3 |
| New Color | 136 | w-colornum | 3 |
| 3Dline Extension | 137 | n-tox/toy/toz | 7 |

> Dateiende: NUL-Byte (1 Byte)

### DXB-Befehle

- **DXBIN:** `Command: dxbin` → Lädt eine `.dxb`-Datei
- **DXB schreiben:** ADI „AutoCAD file output formats" Plotter-Treiber verwenden

---

## 15. Anhang: Group Code Übersicht

### Alle Codes in numerischer Reihenfolge

| Code | Typ | Bedeutung |
|---|---|---|
| `-4` | String | Bedingter Operator (nur für `ssget`/`ads_ssget`) |
| `-3` | — | XDATA-Sentinel (**fest**) |
| `-2` | — | Entitätsname-Referenz (**fest**) |
| `-1` | — | Entitätsname (ändert sich beim Öffnen; nicht gespeichert) (**fest**) |
| `0` | String | Entitätstyp-Start (**fest**) |
| `1` | String | Primärer Textwert |
| `2` | String | Name (Tag, Block-Name usw.) |
| `3–4` | String | Weitere Text-/Namenswerte |
| `5` | String (Hex) | Entity-Handle (**fest**) |
| `6` | String | Linientyp (**fest**) |
| `7` | String | Textstilname (**fest**) |
| `8` | String | Layer-Name (**fest**) |
| `9` | String | Variablenname (nur HEADER) |
| `10–18` | Float | Primärpunkt und weitere X-Koordinaten |
| `39` | Float | Thickness (**fest**) |
| `40–48` | Float | Gleitkommawerte |
| `49` | Float | Wiederholter Wert |
| `50–58` | Float | Winkel |
| `62` | Integer | Farbnummer (**fest**) |
| `66` | Integer | „Entities follow"-Flag (**fest**) |
| `67` | Integer | Modell-/Papierraum (**fest**) |
| `70–78` | Integer | Integer-Werte (Flags, Modi) |
| `210` | Float | Extrusions-Richtung (**fest**) |
| `999` | String | Kommentar |
| `1000` | String | XDATA-String (max. 255 Bytes) |
| `1001` | String | XDATA-Applikationsname (max. 31 Bytes) (**fest**) |
| `1002` | String | XDATA-Kontroll-String (**fest**) |
| `1003` | String | XDATA-Layer-Name |
| `1004` | Bytes | XDATA-Binärdaten (max. 127 Bytes) |
| `1005` | String | XDATA-Entity-Handle |
| `1010` | Float | XDATA-Punkt |
| `1011` | Float | XDATA-3D World Space Position |
| `1012` | Float | XDATA-3D World Space Displacement |
| `1013` | Float | XDATA-3D World Space Direction |
| `1040` | Float | XDATA-Float |
| `1041` | Float | XDATA-Distanz |
| `1042` | Float | XDATA-Skalierungsfaktor |
| `1070` | Integer | XDATA-16-Bit-Integer |
| `1071` | Long | XDATA-32-Bit-Long |

---

## Schnellreferenz: Entitäten und ihre Pflicht-Codes

| Entität | Pflicht-Codes | Optionale Codes |
|---|---|---|
| LINE | `10/20/30` (Start), `11/21/31` (Ende) | `6`, `39`, `62`, `210` |
| POINT | `10/20/30` | `50`, `210` |
| CIRCLE | `10/20/30` (Mitte), `40` (Radius) | `210` |
| ARC | `10/20/30` (Mitte), `40`, `50`, `51` | `210` |
| TRACE | `10–13/20–23/30–33` (4 Ecken) | — |
| SOLID | `10–13/20–23/30–33` (4 Ecken) | — |
| TEXT | `10/20/30`, `40`, `1` | `7`, `41`, `50`, `51`, `71`, `72`, `73` |
| SHAPE | `10/20/30`, `40`, `2` | `41`, `50`, `51` |
| INSERT | `2`, `10/20/30` | `41–43`, `44–45`, `50`, `66`, `70–71` |
| ATTDEF | `10/20/30`, `40`, `1`, `2`, `3`, `70` | `7`, `41`, `50`, `51`, `71`, `72`, `73`, `74` |
| ATTRIB | `10/20/30`, `40`, `1`, `2`, `70` | `7`, `41`, `50`, `51`, `71`, `72`, `74` |
| POLYLINE | `66` (immer 1), `10/20/30` | `40`, `41`, `70–75` |
| VERTEX | `10/20/30` | `40`, `41`, `42`, `50`, `70` |
| SEQEND | — | — |
| 3DFACE | `10–13/20–23/30–33` (4 Ecken) | `70` |
| VIEWPORT | `10/20/30`, `40`, `41`, `68`, `69` | XDATA |
| DIMENSION | `2`, `3`, `10/20/30`, `11/21/31`, `70` | Viele |
| BLOCK | `2`, `3`, `10/20/30`, `70` | `1` (Xref) |

---

*Dokument erstellt aus: AutoCAD Release 12 DXF Reference, Autodesk Inc. © 1993*  
*Konvertiert und strukturiert für KI-Agenten und Entwickler*
