"""Coordinate transformation helpers."""

from __future__ import annotations

import pandas as pd


def add_plot_coordinates(
    points: pd.DataFrame,
    invert_easting: bool = False,
    invert_northing: bool = False,
    positive_easting: bool = False,
) -> pd.DataFrame:
    """Add plotting coordinates without changing original survey coordinates."""
    result = points.copy()
    easting = result["Original Easting"].astype(float)
    northing = result["Original Northing"].astype(float)

    if invert_easting:
        easting = easting * -1
    if invert_northing:
        northing = northing * -1
    if positive_easting:
        easting = easting.abs()

    result["Plot Easting"] = easting
    result["Plot Northing"] = northing
    return result
