from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

from topomapper.config import default_feature_settings
from topomapper.drawing import build_preview, dxf_bytes
from topomapper.exports import (
    cleaned_coordinate_csv,
    feature_summary_csv,
    penzd_csv,
    point_schedule_xlsx,
    zip_package,
)
from topomapper.features import enrich_points, feature_summary, segment_linework
from topomapper.io import CANONICAL_COLUMNS, detect_columns, filter_by_date, normalise_points, read_survey_file
from topomapper.transform import add_plot_coordinates

APP_TITLE = "TopoMapper"
OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

st.set_page_config(page_title=APP_TITLE, page_icon="TM", layout="wide")

if "raw_df" not in st.session_state:
    st.session_state.raw_df = None
if "mapping" not in st.session_state:
    st.session_state.mapping = {}
if "feature_settings" not in st.session_state:
    st.session_state.feature_settings = pd.DataFrame(default_feature_settings())

st.title("TopoMapper")
st.caption("Professional survey drawing generation for AutoCAD and Civil 3D")

page = st.sidebar.radio(
    "Workflow",
    [
        "Upload Survey File",
        "Column Mapping / Auto-detect",
        "Filtering by Date",
        "Coordinate Transformation",
        "Feature Code Settings",
        "Drawing Preview",
        "Export Files",
    ],
)


def require_points():
    raw_df = st.session_state.raw_df
    if raw_df is None:
        st.info("Upload a survey file first.")
        st.stop()
    try:
        return normalise_points(raw_df, st.session_state.mapping)
    except Exception as exc:
        st.error(f"Column mapping needs attention: {exc}")
        st.stop()


def processed_points():
    points = require_points()
    points = filter_by_date(points, st.session_state.get("date_filter", "All points"))
    points = add_plot_coordinates(
        points,
        invert_easting=st.session_state.get("invert_easting", False),
        invert_northing=st.session_state.get("invert_northing", False),
        positive_easting=st.session_state.get("positive_easting", False),
    )
    points = enrich_points(points, st.session_state.feature_settings)
    return points


if page == "Upload Survey File":
    st.header("Upload Survey File")
    uploaded = st.file_uploader("CSV, TXT, XLS, or XLSX survey point file", type=["csv", "txt", "xls", "xlsx"])
    if uploaded:
        df = read_survey_file(uploaded)
        st.session_state.raw_df = df
        st.session_state.mapping = detect_columns(df)
        st.success(f"Loaded {len(df):,} rows from {uploaded.name}")
        st.dataframe(df.head(30), use_container_width=True)
    else:
        st.write("Supported inputs include PENZD, fieldbook CSV, South GPS, Trimble, CHCNAV, Leica, and generic coordinate CSV files.")

elif page == "Column Mapping / Auto-detect":
    st.header("Column Mapping / Auto-detect")
    if st.session_state.raw_df is None:
        st.info("Upload a survey file first.")
        st.stop()
    df = st.session_state.raw_df
    if st.button("Run auto-detect again"):
        st.session_state.mapping = detect_columns(df)
    columns = [None] + [str(col) for col in df.columns]
    mapping = {}
    for key, label in CANONICAL_COLUMNS.items():
        default = st.session_state.mapping.get(key)
        index = columns.index(default) if default in columns else 0
        mapping[key] = st.selectbox(label, columns, index=index, key=f"map_{key}")
    st.session_state.mapping = mapping
    st.dataframe(df.head(20), use_container_width=True)

elif page == "Filtering by Date":
    st.header("Filtering by Date")
    points = require_points()
    mode = st.radio(
        "Point date filter",
        ["All points", "Latest date in file", "Current-day points", "Yesterday's points"],
        index=["All points", "Latest date in file", "Current-day points", "Yesterday's points"].index(
            st.session_state.get("date_filter", "All points")
        ),
    )
    st.session_state.date_filter = mode
    filtered = filter_by_date(points, mode)
    st.metric("Filtered points", len(filtered))
    if points["Date/Time"].notna().any():
        st.write(f"File date range: {points['Date/Time'].min()} to {points['Date/Time'].max()}")
    st.dataframe(filtered.head(50), use_container_width=True)

elif page == "Coordinate Transformation":
    st.header("Coordinate Transformation")
    points = require_points()
    st.session_state.invert_easting = st.checkbox("Plot Easting x -1", value=st.session_state.get("invert_easting", False))
    st.session_state.invert_northing = st.checkbox("Plot Northing x -1", value=st.session_state.get("invert_northing", False))
    st.session_state.positive_easting = st.checkbox("Use positive Eastings for plotting", value=st.session_state.get("positive_easting", False))
    transformed = add_plot_coordinates(
        points,
        st.session_state.invert_easting,
        st.session_state.invert_northing,
        st.session_state.positive_easting,
    )
    st.warning("Original Easting and Original Northing are preserved for setting-out and reports. Transformations apply only to Plot Easting and Plot Northing.")
    st.dataframe(
        transformed[["Point Number", "Original Easting", "Original Northing", "Plot Easting", "Plot Northing", "Elevation", "Description/Code"]].head(80),
        use_container_width=True,
    )

elif page == "Feature Code Settings":
    st.header("Feature Code Settings")
    st.write("Edit code behaviour, layer names, and colours. Same-code linework is split automatically when gaps exceed the preview/export gap setting.")
    edited = st.data_editor(
        st.session_state.feature_settings,
        num_rows="dynamic",
        use_container_width=True,
        column_config={
            "type": st.column_config.SelectboxColumn("type", options=["line", "symbol", "spot"]),
            "colour": st.column_config.TextColumn("colour", help="Hex colour for preview."),
        },
    )
    st.session_state.feature_settings = edited

elif page == "Drawing Preview":
    st.header("Drawing Preview")
    points = processed_points()
    max_gap = st.slider("Break linework when gap exceeds metres", min_value=1.0, max_value=200.0, value=float(st.session_state.get("max_gap", 30.0)), step=1.0)
    st.session_state.max_gap = max_gap
    show_elevations = st.checkbox("Show spot/elevation labels", value=st.session_state.get("show_elevations", True))
    st.session_state.show_elevations = show_elevations
    segments = segment_linework(points, max_gap)
    col1, col2, col3 = st.columns(3)
    col1.metric("Points", len(points))
    col2.metric("Line segments", len(segments))
    col3.metric("Feature codes", points["Feature Code"].nunique())
    fig = build_preview(points, segments, show_elevations)
    st.pyplot(fig, clear_figure=True)
    st.dataframe(feature_summary(points, segments), use_container_width=True)

elif page == "Export Files":
    st.header("Export Files")
    points = processed_points()
    max_gap = float(st.session_state.get("max_gap", 30.0))
    show_elevations = bool(st.session_state.get("show_elevations", True))
    drawing_title = st.text_input("Drawing title", value="Topographical Survey")
    segments = segment_linework(points, max_gap)
    summary = feature_summary(points, segments)

    st.download_button("Download AutoCAD R12 DXF", dxf_bytes(points, max_gap, show_elevations, drawing_title), "topomapper_r12.dxf", "application/dxf")
    st.download_button("Download Civil 3D PENZD CSV", penzd_csv(points), "civil3d_penzd.csv", "text/csv")
    st.download_button("Download Cleaned Coordinate CSV", cleaned_coordinate_csv(points), "cleaned_coordinates.csv", "text/csv")
    st.download_button("Download Excel Point Schedule", point_schedule_xlsx(points, summary), "point_schedule.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    st.download_button("Download Feature Summary", feature_summary_csv(summary), "feature_summary.csv", "text/csv")
    st.download_button("Download ZIP Package", zip_package(points, max_gap, show_elevations, drawing_title), "topomapper_package.zip", "application/zip")

    st.subheader("Export contents")
    st.dataframe(summary, use_container_width=True)
