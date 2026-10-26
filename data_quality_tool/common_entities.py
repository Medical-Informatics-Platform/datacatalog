# Mapping of Excel columns to JSON keys, adjust as necessary,
# Did not contain the values because it is not in a 1 to 1 scenario.
EXCEL_JSON_FIELDS_MAP = {
    "csvFile": "csvFile",
    "name": "label",
    "code": "code",
    "type": "type",
    "values": "enumerations",
    "unit": "units",
    "description": "description",
    "canBeNull": "canBeNull",
    "comments": "comments",
    "conceptPath": "conceptPath",
    "methodology": "methodology",
}


NUMERICAL_TYPES = ("continuous", "discrete")
CATEGORICAL_TYPES = ("nominal", "ordinal", "binary")
VARIABLE_TYPES = NUMERICAL_TYPES + CATEGORICAL_TYPES

EXCEL_COLUMNS = [
    "csvFile",
    "name",
    "code",
    "type",
    "values",
    "unit",
    "description",
    "canBeNull",
    "comments",
    "conceptPath",
    "methodology",
]
REQUIRED_COLUMNS = ["name", "code", "type", "conceptPath"]


class InvalidDataModelError(Exception):
    """Exception raised for errors in the input data model."""


JSON_EXCEL_FIELDS_MAP = {
    "label": "name",
    "code": "code",
    "type": "type",
    "enumerations": "values",
    "minValue": "values",
    "maxValue": "values",
    "units": "units",
    "description": "description",
}
MIN_MAX_PATTERN = r"^([-+]?\d*\.?\d+)-([-+]?\d*\.?\d+)$"
ENUMERATION_PATTERN = r'^\{"[^"]+",\s*"[^"]+"\}(,\s*\{"[^"]+",\s*"[^"]+"\})*$'
