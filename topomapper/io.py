"""Survey file import, column detection, and cleaning."""

from __future__ import annotations

from pathlib import Path
import re
from typing import BinaryIO

import pandas as pd

CANONICAL_COLUMNS = {
    "point": "Point Number",
    "easting": "Easting",
    "northing": "Northing",
    "elevation": "Elevation",
    "code": "Description/Code",
    "datetime": "Date/Time",
}

COLUMN_PATTERNS = {
    "point": [r"^p(oin)?t", r"pt.?no", r"point.?no", r"station", r"number", r"^id$"],
    "easting": [r"east", r"^e$", r"x$", r"grid.?e"],
    "northing": [r"north", r"^n$", r"y$", r"grid.?n"],
    "elevation": [r"elev", r"height", r"level", r"^z$", r"rl"],
    # Do not use a generic "name" match here: survey files commonly have a
    # "Point Name" column alongside the actual "Code" column.
    "code": [r"^code$", r"description", r"desc", r"feature", r"remark"],
    "datetime": [r"date", r"time", r"observed", r"created"],
}


def read_survey_file(uploaded_file: BinaryIO | str | Path) -> pd.DataFrame:
    """Read CSV, TXT, XLS, or XLSX survey files."""
    name = getattr(uploaded_file, "name", str(uploaded_file)).lower()
    suffix = Path(name).suffix

    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(uploaded_file)

    try:
        return pd.read_csv(uploaded_file)
    except Exception:
        if hasattr(uploaded_file, "seek"):
            uploaded_file.seek(0)
        return pd.read_csv(uploaded_file, header=None)


def _normalise_name(name: object) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(name).strip().lower())


def detect_columns(df: pd.DataFrame) -> dict[str, str | None]:
    """Detect common survey columns using names and numeric-column fallbacks."""
    detected: dict[str, str | None] = {key: None for key in CANONICAL_COLUMNS}
    normalised = {_normalise_name(col): col for col in df.columns}

    for key, patterns in COLUMN_PATTERNS.items():
        for normalised_name, original in normalised.items():
            if any(re.search(pattern, normalised_name) for pattern in patterns):
                detected[key] = str(original)
                break

    numeric_cols = []
    for col in df.columns:
        numeric = pd.to_numeric(df[col], errors="coerce")
        if numeric.notna().mean() > 0.6:
            numeric_cols.append(str(col))

    if detected["easting"] is None and len(numeric_cols) >= 2:
        detected["easting"] = numeric_cols[1] if len(numeric_cols) >= 3 else numeric_cols[0]
    if detected["northing"] is None and len(numeric_cols) >= 2:
        detected["northing"] = numeric_cols[2] if len(numeric_cols) >= 3 else numeric_cols[1]
    if detected["elevation"] is None and len(numeric_cols) >= 3:
        detected["elevation"] = numeric_cols[3] if len(numeric_cols) >= 4 else numeric_cols[2]
    if detected["point"] is None and numeric_cols:
        detected["point"] = numeric_cols[0]

    text_cols = [str(col) for col in df.columns if str(col) not in numeric_cols]
    if detected["code"] is None and text_cols:
        detected["code"] = text_cols[-1]

    return detected


def normalise_points(df: pd.DataFrame, mapping: dict[str, str | None]) -> pd.DataFrame:
    """Return a canonical point table while preserving original coordinates."""
    required = ["easting", "northing", "elevation"]
    missing = [CANONICAL_COLUMNS[key] for key in required if not mapping.get(key)]
    if missing:
        raise ValueError("Missing required columns: " + ", ".join(missing))

    result = pd.DataFrame()
    result["Point Number"] = (
        df[mapping["point"]].astype(str).str.strip()
        if mapping.get("point")
        else pd.Series(range(1, len(df) + 1), index=df.index).astype(str)
    )
    result["Original Easting"] = pd.to_numeric(df[mapping["easting"]], errors="coerce")
    result["Original Northing"] = pd.to_numeric(df[mapping["northing"]], errors="coerce")
    result["Elevation"] = pd.to_numeric(df[mapping["elevation"]], errors="coerce")
    result["Description/Code"] = (
        df[mapping["code"]].fillna("SPOT").astype(str).str.strip()
        if mapping.get("code")
        else "SPOT"
    )
    if mapping.get("datetime"):
        result["Date/Time"] = pd.to_datetime(df[mapping["datetime"]], errors="coerce")
    else:
        result["Date/Time"] = pd.NaT

    result["Feature Code"] = result["Description/Code"].map(base_code)
    result = result.dropna(subset=["Original Easting", "Original Northing", "Elevation"]).reset_index(drop=True)
    return result


def base_code(value: object) -> str:
    """Extract the uppercase leading alpha code from a field description."""
    text = str(value).strip().upper().replace(" ", "")
    match = re.match(r"[A-Z]+", text)
    return match.group(0) if match else "SPOT"


def filter_by_date(points: pd.DataFrame, mode: str) -> pd.DataFrame:
    """Filter points by survey date mode."""
    if mode == "All points" or "Date/Time" not in points or points["Date/Time"].isna().all():
        return points.copy()

    dates = points["Date/Time"].dt.date
    today = pd.Timestamp.now().date()
    if mode == "Current-day points":
        target = today
    elif mode == "Yesterday's points":
        target = today - pd.Timedelta(days=1)
    elif mode == "Latest date in file":
        target = dates.max()
    else:
        return points.copy()
    return points.loc[dates == target].copy()
