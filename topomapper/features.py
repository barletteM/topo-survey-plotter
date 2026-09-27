"""Feature classification and linework segmentation."""

from __future__ import annotations

from math import hypot

import pandas as pd

from .config import DEFAULT_COLOURS, DXF_ACI, LINEWORK_CODES, SYMBOL_CODES


def colour_to_aci(colour: str, fallback: int = 8) -> int:
    """Map an editable web hex colour to the nearest useful AutoCAD ACI colour."""
    try:
        value = str(colour).strip().lstrip("#")
        red, green, blue = (int(value[index:index + 2], 16) for index in (0, 2, 4))
    except (TypeError, ValueError):
        return fallback

    palette = {
        1: (255, 0, 0),
        2: (255, 255, 0),
        3: (0, 255, 0),
        4: (0, 255, 255),
        5: (0, 0, 255),
        6: (255, 0, 255),
        7: (255, 255, 255),
        8: (128, 128, 128),
        30: (255, 127, 0),
        32: (189, 94, 0),
        34: (165, 124, 0),
        94: (0, 127, 0),
    }
    return min(
        palette,
        key=lambda aci: sum((actual - target) ** 2 for actual, target in zip((red, green, blue), palette[aci])),
    )


def feature_aci(code: str, colour: str) -> int:
    """Keep canonical survey colours exact; map user-edited colours nearby."""
    code = str(code).upper()
    fallback = DXF_ACI.get(code, 8)
    if str(colour).strip().lower() == DEFAULT_COLOURS.get(code, "").lower():
        return fallback
    return colour_to_aci(colour, fallback)


def settings_to_lookup(settings: pd.DataFrame) -> dict[str, dict[str, str]]:
    lookup = {}
    for _, row in settings.iterrows():
        code = str(row.get("code", "")).strip().upper()
        if not code:
            continue
        lookup[code] = {
            "type": str(row.get("type", "spot")).strip().lower(),
            "colour": str(row.get("colour", DEFAULT_COLOURS.get(code, "#444444"))),
            "layer": str(row.get("layer", f"TOPO-{code}")).strip() or f"TOPO-{code}",
        }
    return lookup


def classify_code(code: str, lookup: dict[str, dict[str, str]]) -> dict[str, str]:
    code = str(code).upper()
    if code in lookup:
        return lookup[code]
    if code in LINEWORK_CODES:
        return {"type": "line", "colour": DEFAULT_COLOURS.get(code, "#444444"), "layer": f"TOPO-{code}"}
    if code in SYMBOL_CODES:
        return {"type": "symbol", "colour": DEFAULT_COLOURS.get(code, "#444444"), "layer": f"TOPO-{code}"}
    return {"type": "spot", "colour": DEFAULT_COLOURS["SPOT"], "layer": "TOPO-SPOTLEVEL"}


def enrich_points(points: pd.DataFrame, settings: pd.DataFrame) -> pd.DataFrame:
    lookup = settings_to_lookup(settings)
    result = points.copy()
    classifications = result["Feature Code"].map(lambda code: classify_code(code, lookup))
    result["Feature Type"] = classifications.map(lambda value: value["type"])
    result["Colour"] = classifications.map(lambda value: value["colour"])
    result["Layer"] = classifications.map(lambda value: value["layer"])
    result["DXF ACI"] = result.apply(lambda row: feature_aci(row["Feature Code"], row["Colour"]), axis=1)
    return result


def segment_linework(points: pd.DataFrame, max_gap: float) -> list[dict[str, object]]:
    """Split same-code linework into separate polylines at large gaps."""
    segments: list[dict[str, object]] = []
    line_points = points.loc[points["Feature Type"] == "line"].copy()
    if line_points.empty:
        return segments

    for code, group in line_points.groupby("Description/Code", sort=False):
        current = []
        last = None
        for _, row in group.sort_index().iterrows():
            xy = (float(row["Plot Easting"]), float(row["Plot Northing"]))
            if last is not None and hypot(xy[0] - last[0], xy[1] - last[1]) > max_gap:
                if len(current) >= 2:
                    segments.append({"code": code, "rows": current})
                current = []
            current.append(row)
            last = xy
        if len(current) >= 2:
            segments.append({"code": code, "rows": current})
    return segments


def feature_summary(points: pd.DataFrame, line_segments: list[dict[str, object]]) -> pd.DataFrame:
    summary = (
        points.groupby(["Feature Code", "Feature Type"], dropna=False)
        .agg(points=("Point Number", "count"), layer=("Layer", "first"))
        .reset_index()
    )
    line_counts = {}
    for segment in line_segments:
        first = segment["rows"][0]
        line_counts[first["Feature Code"]] = line_counts.get(first["Feature Code"], 0) + 1
    summary["line_segments"] = summary["Feature Code"].map(line_counts).fillna(0).astype(int)
    return summary
