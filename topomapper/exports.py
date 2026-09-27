"""File export helpers for TopoMapper."""

from __future__ import annotations

from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import pandas as pd

from .drawing import dxf_bytes
from .features import feature_summary, segment_linework


def cleaned_coordinate_csv(points: pd.DataFrame) -> bytes:
    return points.to_csv(index=False).encode("utf-8")


def penzd_csv(points: pd.DataFrame) -> bytes:
    penzd = points[["Point Number", "Original Easting", "Original Northing", "Elevation", "Description/Code"]].copy()
    penzd.columns = ["Point", "Easting", "Northing", "Elevation", "Description"]
    return penzd.to_csv(index=False).encode("utf-8")


def point_schedule_xlsx(points: pd.DataFrame, summary: pd.DataFrame) -> bytes:
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        points.to_excel(writer, sheet_name="Point Schedule", index=False)
        summary.to_excel(writer, sheet_name="Feature Summary", index=False)
    output.seek(0)
    return output.read()


def feature_summary_csv(summary: pd.DataFrame) -> bytes:
    return summary.to_csv(index=False).encode("utf-8")


def zip_package(points: pd.DataFrame, max_gap: float, show_elevations: bool, drawing_title: str) -> bytes:
    segments = segment_linework(points, max_gap)
    summary = feature_summary(points, segments)
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as package:
        package.writestr("topomapper_r12.dxf", dxf_bytes(points, max_gap, show_elevations, drawing_title))
        package.writestr("civil3d_penzd.csv", penzd_csv(points))
        package.writestr("cleaned_coordinates.csv", cleaned_coordinate_csv(points))
        package.writestr("feature_summary.csv", feature_summary_csv(summary))
        package.writestr("point_schedule.xlsx", point_schedule_xlsx(points, summary))
    output.seek(0)
    return output.read()
