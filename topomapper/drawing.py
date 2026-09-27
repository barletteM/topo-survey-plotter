"""Preview and AutoCAD DXF drawing generation."""

from __future__ import annotations

from math import cos, hypot, pi, sin
import os
from pathlib import Path
import re
import tempfile

import ezdxf
from ezdxf.enums import TextEntityAlignment

MPLCONFIGDIR = Path("outputs/.matplotlib").resolve()
MPLCONFIGDIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPLCONFIGDIR))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, Polygon, Rectangle
import pandas as pd

from .features import segment_linework

COMPANY_NAME = "Kesheshiwe Engineering Surveyors CC"
CLUSTER_CODES = {"TMH", "EB"}
CLUSTER_DISTANCE = 2.2
FENCE_AREA_CODES = {"EF", "PF"}
LINE_STYLES = {
    "EF": ("-", "CONTINUOUS"),
    "PF": ("--", "DASHED"),
    "CF": ((0, (3, 2)), "DASHED"),
    "RC": ((0, (8, 3, 2, 3)), "CENTER"),
}


def data_bounds(points: pd.DataFrame) -> tuple[float, float, float, float, float]:
    xmin = float(points["Plot Easting"].min())
    xmax = float(points["Plot Easting"].max())
    ymin = float(points["Plot Northing"].min())
    ymax = float(points["Plot Northing"].max())
    return xmin, xmax, ymin, ymax, max(xmax - xmin, ymax - ymin, 10.0)


def drawing_bounds(points: pd.DataFrame) -> tuple[float, float, float, float]:
    """Return sheet bounds with room for the legend and title block."""
    xmin, xmax, ymin, ymax, span = data_bounds(points)
    return xmin - span * 0.08, xmax + span * 0.30, ymin - span * 0.20, ymax + span * 0.10


def nice_grid_interval(span: float) -> float:
    for interval in [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]:
        if span / interval <= 10:
            return float(interval)
    return 2000.0


def feature_code(row) -> str:
    return str(row["Feature Code"]).strip().upper()


def polygon_area(coords: list[tuple[float, float]]) -> float:
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(coords, coords[1:] + coords[:1]))) / 2.0


def fence_areas(points: pd.DataFrame) -> list[dict[str, object]]:
    """Return the two largest EF/PF polygons without applying line-gap breaks."""
    areas = []
    fence_points = points.loc[points["Feature Code"].isin(FENCE_AREA_CODES)]
    for _, group in fence_points.groupby("Description/Code", sort=False):
        if len(group) < 3:
            continue
        rows = [row for _, row in group.sort_index().iterrows()]
        code = feature_code(rows[0])
        coords = [(float(row["Plot Easting"]), float(row["Plot Northing"])) for row in rows]
        area = polygon_area(coords)
        if area > 0:
            areas.append({"code": code, "rows": rows, "coords": coords, "area": area})
    return sorted(areas, key=lambda item: item["area"], reverse=True)[:2]


def symbol_features(points: pd.DataFrame) -> list[dict[str, object]]:
    """Return symbols, combining nearby TMH/EB observations into one feature."""
    symbols = points.loc[points["Feature Type"] == "symbol"]
    features: list[dict[str, object]] = []
    used: set[object] = set()
    for index, row in symbols.iterrows():
        if index in used:
            continue
        code = feature_code(row)
        members = [(index, row)]
        used.add(index)
        if code in CLUSTER_CODES:
            changed = True
            while changed:
                changed = False
                for candidate_index, candidate in symbols.loc[symbols["Feature Code"] == code].iterrows():
                    if candidate_index in used:
                        continue
                    cx, cy = float(candidate["Plot Easting"]), float(candidate["Plot Northing"])
                    if any(hypot(cx - float(member["Plot Easting"]), cy - float(member["Plot Northing"])) <= CLUSTER_DISTANCE for _, member in members):
                        members.append((candidate_index, candidate))
                        used.add(candidate_index)
                        changed = True
        rows = [member for _, member in members]
        features.append({
            "code": code,
            "x": sum(float(member["Plot Easting"]) for member in rows) / len(rows),
            "y": sum(float(member["Plot Northing"]) for member in rows) / len(rows),
            "z": sum(float(member["Elevation"]) for member in rows) / len(rows),
            "layer": str(row["Layer"]),
            "colour": str(row["Colour"]),
            "aci": int(row["DXF ACI"]),
            "rows": rows,
        })
    return features


def build_preview(points: pd.DataFrame, line_segments: list[dict[str, object]], show_elevations: bool = True):
    fig, ax = plt.subplots(figsize=(13, 8.5))
    sxmin, sxmax, symin, symax = drawing_bounds(points)
    _, _, _, _, span = data_bounds(points)
    for area in fence_areas(points):
        colour = str(area["rows"][0]["Colour"])
        ax.add_patch(Polygon(area["coords"], closed=True, facecolor=colour, edgecolor=colour, alpha=0.13, linewidth=1.4))
        cx = sum(point[0] for point in area["coords"]) / len(area["coords"])
        cy = sum(point[1] for point in area["coords"]) / len(area["coords"])
        ax.text(cx, cy, f'{area["code"]} {area["area"] / 10000:.4f} ha', fontsize=8, weight="bold", ha="center")
    for segment in line_segments:
        rows = segment["rows"]
        code = feature_code(rows[0])
        xs = [float(row["Plot Easting"]) for row in rows]
        ys = [float(row["Plot Northing"]) for row in rows]
        ax.plot(xs, ys, color=rows[0]["Colour"], linewidth=1.9, linestyle=LINE_STYLES.get(code, ("-", "CONTINUOUS"))[0])
        ax.text(xs[0], ys[0], f" {code} LINE", fontsize=7, weight="bold")
    size = max(span / 150.0, 0.35)
    for feature in symbol_features(points):
        add_preview_symbol(ax, feature, size)
        add_preview_point_label(ax, feature, size, show_elevations)
    for _, row in points.loc[points["Feature Type"] == "spot"].iterrows():
        x, y = float(row["Plot Easting"]), float(row["Plot Northing"])
        ax.scatter(x, y, color=row["Colour"], s=18, marker="o", zorder=4)
        label = f'{feature_code(row)} #{row["Point Number"]}'
        if show_elevations:
            label += f' RL {row["Elevation"]:.2f}'
        ax.text(x + size * 0.6, y + size * 0.6, label, fontsize=6.5)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlim(sxmin, sxmax)
    ax.set_ylim(symin, symax)
    ax.grid(True, color="#d9dedb", linewidth=0.55)
    ax.set_title("TopoMapper Drawing Preview")
    ax.set_xlabel("Easting (m)")
    ax.set_ylabel("Northing (m)")
    add_preview_map_elements(ax, points, span)
    fig.tight_layout()
    return fig


def add_preview_symbol(ax, feature: dict[str, object], size: float) -> None:
    x, y = float(feature["x"]), float(feature["y"])
    code, colour = str(feature["code"]), str(feature["colour"])
    common = {"fill": False, "edgecolor": colour, "linewidth": 1.5, "zorder": 5}
    if code in {"BH", "EBH"}:
        ax.add_patch(Circle((x, y), size * 0.55, **common))
        ax.plot([x - size * 0.85, x + size * 0.85], [y, y], color=colour, linewidth=1.5)
        ax.plot([x, x], [y - size * 0.85, y + size * 0.85], color=colour, linewidth=1.5)
        ax.add_patch(Circle((x, y), size * 0.12, facecolor=colour, edgecolor=colour, zorder=6))
    elif code in {"BM", "REF"}:
        ax.add_patch(Circle((x, y), size * 0.55, **common))
        ax.plot([x - size * 0.8, x + size * 0.8], [y, y], color=colour, linewidth=1.4)
        ax.plot([x, x], [y - size * 0.8, y + size * 0.8], color=colour, linewidth=1.4)
        ax.text(x, y, "BM", fontsize=5, ha="center", va="center", weight="bold")
    elif code in {"TREE", "PALMTREE"}:
        ax.add_patch(Circle((x, y), size * 0.28, **common))
        for index in range(8):
            angle = 2 * pi * index / 8
            ax.plot([x, x + cos(angle) * size], [y, y + sin(angle) * size], color=colour, linewidth=1.2)
    elif code == "SL":
        ax.add_patch(Circle((x, y), size * 0.22, **common))
        ax.plot([x, x], [y, y + size * 1.25], color=colour, linewidth=1.5)
        ax.plot([x, x + size * 0.8], [y + size * 1.25, y + size], color=colour, linewidth=1.5)
        ax.add_patch(Circle((x + size * 0.9, y + size * 0.92), size * 0.18, facecolor="#ffd45c", edgecolor=colour, zorder=5))
    elif code == "TMH":
        ax.add_patch(Rectangle((x - size * 0.75, y - size * 0.5), size * 1.5, size, **common))
        ax.plot([x - size * 0.55, x + size * 0.55], [y, y], color=colour, linewidth=1.4)
        ax.text(x, y, "T", fontsize=6, ha="center", va="center", weight="bold", color=colour)
    elif code == "EB":
        ax.add_patch(Rectangle((x - size * 0.6, y - size * 0.6), size * 1.2, size * 1.2, **common))
        ax.plot([x - size * 0.2, x - size * 0.5, x, x - size * 0.12, x + size * 0.5], [y + size * 0.45, y, y, y - size * 0.5, y + size * 0.15], color=colour, linewidth=1.5)
    elif code == "MH":
        ax.add_patch(Circle((x, y), size * 0.58, **common))
        ax.add_patch(Circle((x, y), size * 0.38, **common))
        ax.text(x, y, "MH", fontsize=5, ha="center", va="center", weight="bold")
    else:
        ax.add_patch(Circle((x, y), size * 0.35, **common))
        ax.plot([x - size * 0.5, x + size * 0.5], [y, y], color=colour, linewidth=1.2)
        ax.plot([x, x], [y - size * 0.5, y + size * 0.5], color=colour, linewidth=1.2)


def add_preview_point_label(ax, feature: dict[str, object], size: float, show_elevations: bool) -> None:
    numbers = "/".join(str(row["Point Number"]) for row in feature["rows"])
    label = str(feature["code"])
    if len(feature["rows"]) > 1:
        label += f' x{len(feature["rows"])}'
    label += f" #{numbers}"
    if show_elevations:
        label += f' RL {float(feature["z"]):.2f}'
    ax.text(float(feature["x"]) + size, float(feature["y"]) + size, label, fontsize=6.5, zorder=6)


def add_preview_map_elements(ax, points: pd.DataFrame, span: float) -> None:
    sxmin, sxmax = ax.get_xlim()
    symin, symax = ax.get_ylim()
    _, _, _, ymax, _ = data_bounds(points)
    ax.annotate("N", xy=(sxmin + span * 0.08, ymax + span * 0.06), ha="center", fontsize=12, weight="bold")
    ax.arrow(sxmin + span * 0.08, ymax - span * 0.03, 0, span * 0.07, head_width=span * 0.012, color="black")
    ax.add_patch(Rectangle((sxmin, symin), sxmax - sxmin, symax - symin, fill=False, linewidth=1.2, edgecolor="black"))
    ax.text(sxmin + span * 0.02, symin + span * 0.025, COMPANY_NAME, fontsize=8, weight="bold")
    ax.text(sxmax - span * 0.02, symin + span * 0.025, f"{len(points)} points | Units: metres", fontsize=8, ha="right")
    handles = []
    for _, row in points.drop_duplicates("Feature Code").head(14).iterrows():
        code = feature_code(row)
        if row["Feature Type"] == "line":
            handles.append(Line2D([0], [0], color=row["Colour"], linestyle=LINE_STYLES.get(code, ("-", "CONTINUOUS"))[0], label=code))
        else:
            handles.append(Line2D([0], [0], color=row["Colour"], marker="o", linestyle="None", label=code))
    if handles:
        ax.legend(handles=handles, title="Legend", loc="upper right", fontsize=7, title_fontsize=8, framealpha=0.92)


def write_dxf(points: pd.DataFrame, output_path: str | Path, max_gap: float, show_elevations: bool = True, drawing_title: str = "Topographical Survey") -> Path:
    """Write a layered, coloured AutoCAD R12 DXF in metre drawing units."""
    output_path = Path(output_path)
    line_segments = segment_linework(points, max_gap)
    doc = ezdxf.new("R12")
    setup_linetypes(doc)
    setup_layers(doc, points)
    msp = doc.modelspace()
    sxmin, sxmax, symin, symax = drawing_bounds(points)
    doc.header["$EXTMIN"] = (sxmin, symin, 0)
    doc.header["$EXTMAX"] = (sxmax, symax, 0)
    for area in fence_areas(points):
        layer = dxf_layer_name(area["rows"][0]["Layer"])
        add_area_fill(msp, area["coords"], layer, int(area["rows"][0]["DXF ACI"]))
        msp.add_polyline2d(area["coords"], close=True, dxfattribs={"layer": layer})
        cx = sum(point[0] for point in area["coords"]) / len(area["coords"])
        cy = sum(point[1] for point in area["coords"]) / len(area["coords"])
        add_text(msp, f'{area["code"]} {area["area"] / 10000:.4f} ha', cx, cy, dxf_text_size(points) * 1.15, layer, TextEntityAlignment.MIDDLE_CENTER)
    for segment in line_segments:
        rows = segment["rows"]
        layer = dxf_layer_name(rows[0]["Layer"])
        coords = [(float(row["Plot Easting"]), float(row["Plot Northing"])) for row in rows]
        msp.add_polyline2d(coords, dxfattribs={"layer": layer})
        add_text(msp, f"{feature_code(rows[0])} LINE", coords[0][0], coords[0][1], dxf_text_size(points) * 0.85, layer)
    size = dxf_symbol_size(points)
    for feature in symbol_features(points):
        add_dxf_symbol(msp, feature, size)
        add_dxf_point_label(msp, feature, size, show_elevations)
    for _, row in points.loc[points["Feature Type"] == "spot"].iterrows():
        x, y = float(row["Plot Easting"]), float(row["Plot Northing"])
        layer = dxf_layer_name(row["Layer"])
        msp.add_point((x, y), dxfattribs={"layer": layer})
        label = f'{feature_code(row)} #{row["Point Number"]}'
        if show_elevations:
            label += f' RL {row["Elevation"]:.3f}'
        add_text(msp, label, x + size * 0.55, y + size * 0.55, dxf_text_size(points), layer)
    add_map_elements(doc, msp, points, drawing_title)
    doc.saveas(output_path)
    return output_path


def setup_linetypes(doc) -> None:
    if "DASHED" not in doc.linetypes:
        doc.linetypes.add("DASHED", pattern=[0.6, 0.35, -0.25], description="Dashed")
    if "CENTER" not in doc.linetypes:
        doc.linetypes.add("CENTER", pattern=[1.2, 0.65, -0.2, 0.15, -0.2], description="Centre")


def setup_layers(doc, points: pd.DataFrame) -> None:
    for layer, layer_points in points.groupby("Layer"):
        code = feature_code(layer_points.iloc[0])
        name = dxf_layer_name(layer)
        aci = int(layer_points["DXF ACI"].iloc[0]) if "DXF ACI" in layer_points else 8
        linetype = LINE_STYLES.get(code, ("-", "CONTINUOUS"))[1]
        if name not in doc.layers:
            doc.layers.add(name=name, color=aci, linetype=linetype)
    for name, color in [("TOPO-SHEET", 7), ("TOPO-GRID", 8), ("TOPO-TEXT", 7)]:
        if name not in doc.layers:
            doc.layers.add(name=name, color=color)


def dxf_layer_name(value: object) -> str:
    return (re.sub(r'[<>/\\":;?*|=]', "-", str(value).strip().upper()) or "TOPO-UNKNOWN")[:31]


def dxf_symbol_size(points: pd.DataFrame) -> float:
    return max(0.45, min(6.0, data_bounds(points)[4] / 150.0))


def dxf_text_size(points: pd.DataFrame) -> float:
    return max(0.22, dxf_symbol_size(points) * 0.48)


def add_dxf_symbol(msp, feature: dict[str, object], size: float) -> None:
    x, y = float(feature["x"]), float(feature["y"])
    code, layer = str(feature["code"]), dxf_layer_name(feature["layer"])
    attrs = {"layer": layer}
    if code in {"BH", "EBH"}:
        msp.add_circle((x, y), size * 0.55, dxfattribs=attrs)
        msp.add_circle((x, y), size * 0.13, dxfattribs=attrs)
        msp.add_line((x - size * 0.85, y), (x + size * 0.85, y), dxfattribs=attrs)
        msp.add_line((x, y - size * 0.85), (x, y + size * 0.85), dxfattribs=attrs)
    elif code in {"BM", "REF"}:
        msp.add_circle((x, y), size * 0.55, dxfattribs=attrs)
        msp.add_line((x - size * 0.8, y), (x + size * 0.8, y), dxfattribs=attrs)
        msp.add_line((x, y - size * 0.8), (x, y + size * 0.8), dxfattribs=attrs)
        add_text(msp, "BM", x, y, size * 0.28, layer, TextEntityAlignment.MIDDLE_CENTER)
    elif code in {"TREE", "PALMTREE"}:
        msp.add_circle((x, y), size * 0.28, dxfattribs=attrs)
        for index in range(8):
            angle = 2 * pi * index / 8
            msp.add_line((x, y), (x + cos(angle) * size, y + sin(angle) * size), dxfattribs=attrs)
    elif code == "SL":
        msp.add_circle((x, y), size * 0.22, dxfattribs=attrs)
        msp.add_line((x, y), (x, y + size * 1.25), dxfattribs=attrs)
        msp.add_line((x, y + size * 1.25), (x + size * 0.8, y + size), dxfattribs=attrs)
        msp.add_circle((x + size * 0.9, y + size * 0.92), size * 0.18, dxfattribs=attrs)
    elif code == "TMH":
        add_dxf_rectangle(msp, x, y, size * 1.5, size, layer)
        msp.add_line((x - size * 0.55, y), (x + size * 0.55, y), dxfattribs=attrs)
        add_text(msp, "T", x, y, size * 0.42, layer, TextEntityAlignment.MIDDLE_CENTER)
    elif code == "EB":
        add_dxf_rectangle(msp, x, y, size * 1.2, size * 1.2, layer)
        msp.add_polyline2d([(x - size * 0.2, y + size * 0.45), (x - size * 0.5, y), (x, y), (x - size * 0.12, y - size * 0.5), (x + size * 0.5, y + size * 0.15)], dxfattribs=attrs)
    elif code == "MH":
        msp.add_circle((x, y), size * 0.58, dxfattribs=attrs)
        msp.add_circle((x, y), size * 0.38, dxfattribs=attrs)
        add_text(msp, "MH", x, y, size * 0.25, layer, TextEntityAlignment.MIDDLE_CENTER)
    elif code in {"POLE", "TP", "PP"}:
        msp.add_circle((x, y), size * 0.3, dxfattribs=attrs)
        msp.add_line((x - size * 0.55, y), (x + size * 0.55, y), dxfattribs=attrs)
        msp.add_line((x, y - size * 0.55), (x, y + size * 0.55), dxfattribs=attrs)
    else:
        msp.add_circle((x, y), size * 0.35, dxfattribs=attrs)
        msp.add_line((x - size * 0.5, y), (x + size * 0.5, y), dxfattribs=attrs)
        msp.add_line((x, y - size * 0.5), (x, y + size * 0.5), dxfattribs=attrs)


def add_dxf_point_label(msp, feature: dict[str, object], size: float, show_elevations: bool) -> None:
    numbers = "/".join(str(row["Point Number"]) for row in feature["rows"])
    label = str(feature["code"])
    if len(feature["rows"]) > 1:
        label += f' x{len(feature["rows"])}'
    label += f" #{numbers}"
    if show_elevations:
        label += f' RL {float(feature["z"]):.3f}'
    add_text(msp, label, float(feature["x"]) + size, float(feature["y"]) + size, size * 0.48, dxf_layer_name(feature["layer"]))


def add_dxf_rectangle(msp, x: float, y: float, width: float, height: float, layer: str) -> None:
    left, right = x - width / 2, x + width / 2
    bottom, top = y - height / 2, y + height / 2
    msp.add_polyline2d([(left, bottom), (right, bottom), (right, top), (left, top)], close=True, dxfattribs={"layer": layer})


def add_area_fill(msp, coords: list[tuple[float, float]], layer: str, aci: int) -> None:
    """Add R12-compatible SOLID triangles behind a closed area."""
    try:
        from shapely.geometry import Polygon as ShapelyPolygon
        from shapely.ops import triangulate
        polygon = ShapelyPolygon(coords)
        if not polygon.is_valid:
            polygon = polygon.buffer(0)
        for triangle in triangulate(polygon):
            if polygon.covers(triangle.representative_point()):
                vertices = list(triangle.exterior.coords)[:3]
                msp.add_solid([vertices[0], vertices[1], vertices[2], vertices[2]], dxfattribs={"layer": layer, "color": aci})
    except (ImportError, ValueError):
        return


def add_text(msp, text: str, x: float, y: float, height: float, layer: str, align=None) -> None:
    entity = msp.add_text(str(text), dxfattribs={"height": height, "layer": layer})
    entity.set_placement((x, y), align=align or TextEntityAlignment.LEFT)


def add_map_elements(doc, msp, points: pd.DataFrame, title: str) -> None:
    sxmin, sxmax, symin, symax = drawing_bounds(points)
    xmin, xmax, ymin, ymax, span = data_bounds(points)
    add_border(msp, sxmin, symin, sxmax, symax, "TOPO-SHEET")
    add_grid(msp, xmin, ymin, xmax, ymax, "TOPO-GRID", span)
    add_north_arrow(msp, sxmin + span * 0.08, ymax + span * 0.01, span * 0.04, "TOPO-SHEET")
    add_scale_bar(msp, sxmin + span * 0.08, ymin - span * 0.09, span, "TOPO-SHEET")
    add_legend(msp, points, xmax + span * 0.04, ymax, span, "TOPO-SHEET")
    add_title_block(msp, sxmin, symin, sxmax, ymin - span * 0.025, title, "TOPO-SHEET", len(points), span)


def add_border(msp, xmin: float, ymin: float, xmax: float, ymax: float, layer: str) -> None:
    msp.add_polyline2d([(xmin, ymin), (xmax, ymin), (xmax, ymax), (xmin, ymax)], close=True, dxfattribs={"layer": layer})


def add_grid(msp, xmin: float, ymin: float, xmax: float, ymax: float, layer: str, span: float) -> None:
    interval = nice_grid_interval(span)
    text_height = max(span * 0.004, 0.2)
    x = (int(xmin // interval) + 1) * interval
    while x < xmax:
        msp.add_line((x, ymin), (x, ymax), dxfattribs={"layer": layer})
        add_text(msp, f"{x:.0f}", x, ymin - span * 0.012, text_height, layer, TextEntityAlignment.CENTER)
        x += interval
    y = (int(ymin // interval) + 1) * interval
    while y < ymax:
        msp.add_line((xmin, y), (xmax, y), dxfattribs={"layer": layer})
        add_text(msp, f"{y:.0f}", xmin - span * 0.012, y, text_height, layer, TextEntityAlignment.RIGHT)
        y += interval
    cross_size = max(span * 0.008, 0.3)
    for x, y in [(xmin, ymin), ((xmin + xmax) / 2, ymin), (xmax, ymin), (xmin, (ymin + ymax) / 2), (xmax, (ymin + ymax) / 2), (xmin, ymax), ((xmin + xmax) / 2, ymax), (xmax, ymax)]:
        msp.add_line((x - cross_size, y), (x + cross_size, y), dxfattribs={"layer": layer})
        msp.add_line((x, y - cross_size), (x, y + cross_size), dxfattribs={"layer": layer})


def add_north_arrow(msp, x: float, y: float, size: float, layer: str) -> None:
    msp.add_line((x, y - size), (x, y + size), dxfattribs={"layer": layer})
    msp.add_solid([(x, y + size), (x - size * 0.28, y + size * 0.35), (x + size * 0.28, y + size * 0.35), (x + size * 0.28, y + size * 0.35)], dxfattribs={"layer": layer})
    add_text(msp, "N", x, y + size * 1.25, size * 0.32, layer, TextEntityAlignment.CENTER)


def add_scale_bar(msp, x: float, y: float, drawing_span: float, layer: str) -> None:
    length = nice_grid_interval(drawing_span) * 2
    text_height = max(length * 0.035, 0.2)
    msp.add_line((x, y), (x + length, y), dxfattribs={"layer": layer})
    for index in range(3):
        px = x + index * length / 2
        msp.add_line((px, y - length * 0.03), (px, y + length * 0.03), dxfattribs={"layer": layer})
        add_text(msp, f"{index * length / 2:.0f}", px, y - length * 0.09, text_height, layer, TextEntityAlignment.CENTER)
    add_text(msp, "metres", x + length * 0.5, y + length * 0.06, text_height, layer, TextEntityAlignment.CENTER)


def add_legend(msp, points: pd.DataFrame, x: float, y: float, span: float, layer: str) -> None:
    unique = points.drop_duplicates("Feature Code").head(14)
    text_height = max(span * 0.0045, 0.24)
    row_height = text_height * 2.2
    symbol_size = row_height * 0.48
    width = span * 0.23
    height = row_height * (len(unique) + 1.5)
    top, bottom = y + row_height * 0.5, y + row_height * 0.5 - height
    msp.add_polyline2d([(x, bottom), (x + width, bottom), (x + width, top), (x, top)], close=True, dxfattribs={"layer": layer})
    add_text(msp, "LEGEND", x + text_height, y, text_height * 1.25, layer)
    for index, (_, row) in enumerate(unique.iterrows(), start=1):
        yy = y - index * row_height
        feature_layer, code = dxf_layer_name(row["Layer"]), feature_code(row)
        if row["Feature Type"] == "line":
            msp.add_line((x + text_height, yy), (x + text_height + symbol_size * 2.6, yy), dxfattribs={"layer": feature_layer})
        elif row["Feature Type"] == "symbol":
            add_dxf_symbol(msp, {"code": code, "x": x + text_height + symbol_size, "y": yy, "layer": feature_layer}, symbol_size)
        else:
            msp.add_point((x + text_height + symbol_size, yy), dxfattribs={"layer": feature_layer})
        add_text(msp, code, x + text_height + symbol_size * 3.2, yy - text_height * 0.3, text_height, layer)


def add_title_block(msp, xmin: float, ymin: float, xmax: float, ytop: float, title: str, layer: str, point_count: int, span: float) -> None:
    msp.add_polyline2d([(xmin, ymin), (xmax, ymin), (xmax, ytop), (xmin, ytop)], close=True, dxfattribs={"layer": layer})
    text_height = max(span * 0.005, 0.25)
    add_text(msp, COMPANY_NAME, xmin + span * 0.02, ytop - text_height * 1.8, text_height * 1.25, layer)
    add_text(msp, title, xmin + span * 0.02, ytop - text_height * 3.2, text_height, layer)
    add_text(msp, f"Units: metres | Points: {point_count} | AutoCAD R12 DXF", xmin + span * 0.02, ytop - text_height * 4.5, text_height * 0.8, layer)


def dxf_bytes(points: pd.DataFrame, max_gap: float, show_elevations: bool, drawing_title: str) -> bytes:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "topomapper.dxf"
        write_dxf(points, path, max_gap, show_elevations, drawing_title)
        return path.read_bytes()
