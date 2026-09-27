# TopoMapper

TopoMapper is a Streamlit desktop/web application for generating professional topographical survey drawings from survey point files.

It imports PENZD, fieldbook CSV, South GPS, Trimble, CHCNAV, Leica, and generic coordinate CSV/XLS/XLSX data, then exports AutoCAD-ready DXF and reporting files.

## Main Features

- Import `.csv`, `.txt`, `.xls`, and `.xlsx` point files.
- Auto-detect Point Number, Easting, Northing, Elevation, Description/Code, and Date/Time columns.
- Filter all points, latest date in file, current-day points, or yesterday's points.
- Preserve original survey coordinates for setting-out and reports.
- Apply plotting-only coordinate transforms: Easting x -1, Northing x -1, and positive Eastings.
- Generate AutoCAD R12 DXF drawing files in metre drawing units.
- Match preview colours in DXF layers, including dashed PF/CF lines and centre-style RC lines.
- Draw dedicated CAD symbols for BH/EBH, BM/REF, palm trees, street lights, TMH, EB, MH, and poles.
- Cluster nearby TMH and EB observations into one labelled feature symbol.
- Close and shade the two largest EF/PF boundaries and label their areas in hectares.
- Join linework by feature code while breaking large gaps and ignoring isolated line points.
- Add north arrow, symbol legend, scale bar, full coordinate grid with corner/midpoint crosses, title block, border, and company name.
- Export Civil 3D PENZD CSV, cleaned coordinate CSV, Excel point schedule, feature summary, and ZIP package.

Company name used in drawings:

```text
Kesheshiwe Engineering Surveyors CC
```

## Default Feature Behaviour

Linework codes:

```text
EF, PF, CF, RC, RE, ETW, CL, EP, KERB, SWI, SWO, WALL, FENCE, BUILDING
```

Symbol/point codes:

```text
BM, REF, BH, EBH, MH, ICV, FH, TREE, PALMTREE, SL, POLE, TP, EB, TMH
```

Unknown codes are treated as spot levels and receive elevation labels. You can edit code type, layer, and preview colour in the **Feature Code Settings** page.

## Install

Python 3.11+ is recommended.

```powershell
pip install -r requirements.txt
```

## Run

```powershell
streamlit run app.py
```

If you are using the bundled Codex Python runtime in this workspace, this command also works:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m streamlit run app.py
```

Then open the local URL shown by Streamlit, usually:

```text
http://localhost:8501
```

## Workflow

1. **Upload Survey File**: Load CSV, TXT, XLS, or XLSX data.
2. **Column Mapping / Auto-detect**: Confirm or adjust detected columns.
3. **Filtering by Date**: Select all, latest, current-day, or yesterday's points.
4. **Coordinate Transformation**: Choose plotting-only sign inversion options.
5. **Feature Code Settings**: Adjust line/symbol/spot behaviour, colours, and layers.
6. **Drawing Preview**: Inspect linework, symbols, labels, grid, and map elements.
7. **Export Files**: Download DXF, CSV, Excel, summary, or a complete ZIP package.

## Coordinate Safety

TopoMapper never overwrites original coordinates.

- `Original Easting` and `Original Northing` are used for setting-out data and Civil 3D PENZD export.
- `Plot Easting` and `Plot Northing` are used only for preview and DXF drawing generation.
- Sign inversion and positive-Easting options affect plotting coordinates only.

## Sample Data

A sample PENZD-style file is included:

```text
sample_data/sample_penzd.csv
```

Generated files can be saved in:

```text
outputs/
```

## Notes

AutoCAD R12 does not formally store modern `$INSUNITS` unit metadata. TopoMapper writes coordinates directly in metre drawing units and labels the title block as metres so AutoCAD/Civil 3D users can insert/open the file at 1 drawing unit = 1 metre.
