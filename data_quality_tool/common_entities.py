import re

# Mapping of Excel columns to JSON keys. enumerations is 1:1; range is
# special-cased onto minValue/maxValue in the converters.
EXCEL_JSON_FIELDS_MAP = {
    "name": "label",
    "code": "code",
    "type": "type",
    "enumerations": "enumerations",
    "range": "range",
    "unit": "units",
    "description": "description",
    "comments": "comments",
    "conceptPath": "conceptPath",
}


NUMERICAL_TYPES = ("continuous", "discrete")
CATEGORICAL_TYPES = ("nominal", "ordinal", "binary")
VARIABLE_TYPES = NUMERICAL_TYPES + CATEGORICAL_TYPES

EXCEL_COLUMNS = [
    "name",
    "code",
    "type",
    "enumerations",
    "range",
    "unit",
    "description",
    "comments",
    "conceptPath",
]
# Columns an uploaded Excel must contain; extra columns are tolerated.
REQUIRED_EXCEL_COLUMNS = [
    "name",
    "code",
    "type",
    "enumerations",
    "range",
    "unit",
    "description",
    "comments",
    "conceptPath",
]
REQUIRED_COLUMNS = ["name", "code", "type", "conceptPath"]


class InvalidDataModelError(Exception):
    """Exception raised for errors in the input data model."""


JSON_EXCEL_FIELDS_MAP = {
    "label": "name",
    "code": "code",
    "type": "type",
    "enumerations": "enumerations",
    "minValue": "range",
    "maxValue": "range",
    "units": "unit",
    "description": "description",
}
MIN_MAX_PATTERN = r"^([-+]?\d*\.?\d+)-([-+]?\d*\.?\d+)$"
ENUMERATION_PATTERN = r'^\{"[^"]+",\s*"[^"]+"\}(,\s*\{"[^"]+",\s*"[^"]+"\})*$'

# Exaflow data contract (exaflow/documentation/data-types-and-coding.md and
# exadata-validator dataelements.py): every categorical CDE has integer codes,
# binary exactly 0 and 1, nominal and ordinal from 1.
INTEGER_CODE_PATTERN = r"0|-?[1-9][0-9]*"


def validate_enumeration_codes(variable_type, codes):
    """Raise InvalidDataModelError when categorical codes break the Exaflow contract."""
    if not codes:
        raise InvalidDataModelError(f"Type '{variable_type}' requires enumerations.")
    codes = [str(code) for code in codes]
    non_integer = [
        code for code in codes if not re.fullmatch(INTEGER_CODE_PATTERN, code)
    ]
    if non_integer:
        raise InvalidDataModelError(
            f"Type '{variable_type}' requires integer enumeration codes but got {non_integer}."
        )
    numbers = sorted(int(code) for code in codes)
    if variable_type == "binary" and numbers != [0, 1]:
        raise InvalidDataModelError(
            f"Type 'binary' requires enumeration codes exactly 0 and 1 but got {codes}."
        )
    if variable_type != "binary" and numbers[0] < 1:
        raise InvalidDataModelError(
            f"Type '{variable_type}' requires enumeration codes starting from 1 but got {codes}."
        )
