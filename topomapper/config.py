"""Default feature-code settings for TopoMapper."""

LINEWORK_CODES = {
    "EF",
    "PF",
    "CF",
    "RC",
    "RE",
    "ETW",
    "CL",
    "EP",
    "KERB",
    "SWI",
    "SWO",
    "WALL",
    "FENCE",
    "BUILDING",
}

SYMBOL_CODES = {
    "BM",
    "REF",
    "BH",
    "EBH",
    "MH",
    "ICV",
    "FH",
    "TREE",
    "PALMTREE",
    "SL",
    "POLE",
    "TP",
    "EB",
    "TMH",
}

DEFAULT_COLOURS = {
    "EF": "#1f7a35",
    "PF": "#d22f27",
    "CF": "#7b3fb2",
    "RC": "#f0a000",
    "RE": "#d62728",
    "ETW": "#ff7f0e",
    "CL": "#f1c40f",
    "EP": "#8c564b",
    "KERB": "#9467bd",
    "SWI": "#1f77b4",
    "SWO": "#17becf",
    "WALL": "#7f7f7f",
    "FENCE": "#2ca02c",
    "BUILDING": "#111111",
    "BM": "#e377c2",
    "REF": "#111111",
    "BH": "#b6422b",
    "EBH": "#b6422b",
    "MH": "#bcbd22",
    "ICV": "#00a676",
    "FH": "#d62728",
    "TREE": "#228b22",
    "PALMTREE": "#228b22",
    "SL": "#8a6d00",
    "POLE": "#6b4f2a",
    "TP": "#6b4f2a",
    "EB": "#ffbf00",
    "TMH": "#1f77b4",
    "SPOT": "#444444",
}

DXF_ACI = {
    "EF": 3,
    "PF": 1,
    "CF": 6,
    "RC": 2,
    "RE": 1,
    "ETW": 30,
    "CL": 2,
    "EP": 32,
    "KERB": 6,
    "SWI": 5,
    "SWO": 4,
    "WALL": 8,
    "FENCE": 3,
    "BUILDING": 7,
    "BM": 6,
    "REF": 7,
    "BH": 30,
    "EBH": 30,
    "MH": 2,
    "ICV": 3,
    "FH": 1,
    "TREE": 94,
    "PALMTREE": 94,
    "SL": 34,
    "POLE": 32,
    "TP": 32,
    "EB": 2,
    "TMH": 5,
    "SPOT": 8,
}


def default_feature_settings():
    """Return mutable defaults for the Streamlit settings editor."""
    rows = []
    for code in sorted(LINEWORK_CODES):
        rows.append(
            {
                "code": code,
                "type": "line",
                "colour": DEFAULT_COLOURS.get(code, "#444444"),
                "layer": f"TOPO-{code}",
            }
        )
    for code in sorted(SYMBOL_CODES):
        rows.append(
            {
                "code": code,
                "type": "symbol",
                "colour": DEFAULT_COLOURS.get(code, "#444444"),
                "layer": f"TOPO-{code}",
            }
        )
    rows.append({"code": "SPOT", "type": "spot", "colour": DEFAULT_COLOURS["SPOT"], "layer": "TOPO-SPOTLEVEL"})
    return rows
