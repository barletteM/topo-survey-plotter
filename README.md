# Topo Survey Plotter

A local browser app for plotting topographical survey CSV files.

Open `index.html` in a browser, then load a CSV with this format:

```text
PointNo,Easting,Northing,Elevation,Code
```

Headerless CSV files in the same order are accepted.

## What it does

- Uses a built-in topo code library based on the existing V3.2 workflow.
- Lets you add or update field codes.
- Lets you define whether a code plots as a point, line, closed line, or label.
- Uses topo symbology for common features such as palm trees, street lights, telecom manholes, and electrical boxes.
- Clusters nearby `TMH` and `EB` shots into one plotted symbol, useful when four cover/corner shots describe one feature.
- Plots `BH` and `EBH` as boreholes, `BM`/`REF` as benchmark/reference marks, and `RC` as road centre linework.
- Uses colour-coded fence layers for `EF` existing fence, `PF` proposed fence, and `CF` corrected fence.
- Draws a north arrow, legend, and grid crossing marks.
- Calculates and labels the two biggest `EF`/`PF` closed fence areas in hectares.
- Exports DXF with coordinate inversion enabled by default for the requested AutoCAD orientation.
- DXF export includes a layer table with AutoCAD colour indexes, CAD-drawn symbols, legend, north arrow, grid crosses, and area labels.
- Shows a plot log so you can see exactly which codes produced points and which produced linework.
- Exports SVG, DXF, and a cleaned CSV.

## Prefix Codes

Use an asterisk for code families. For example:

- `RE*` plots `RE1`, `RE2`, `RE3` as road edge lines.
- `BC*` plots `BC1`, `BC2` as closed building outlines.
- `FNC*` plots numbered fence codes as linework.

Your code library is saved in the browser, and the Reset button restores the built-in list.

## Plot Instructions

The app also has a Plot Instructions panel for job-specific plotting rules. Use one instruction per line.

```text
AREA EP LAYER TOPO-BOUNDARY
SYMBOL BH BOREHOLE LAYER TOPO-BOREHOLE
```

Supported instructions:

- `AREA EP` closes all points with code `EP` into a plotted boundary area.
- `AREA EP*` closes all points where the code starts with `EP`.
- `SYMBOL BH BOREHOLE` plots `BH` points with a borehole symbol.
- Add `LAYER layer-name` to control the export layer.

Instructions are saved in the browser. They are intended for plotting rules that change from job to job without editing the app code.
