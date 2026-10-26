import unittest

from common_entities import VARIABLE_TYPES, InvalidDataModelError
from converter.excel_to_json import validate_variable_type


class TestValidateVariableType(unittest.TestCase):
    def test_with_valid_type(self):
        for valid_type in VARIABLE_TYPES:
            row = {"type": valid_type}
            validate_variable_type(row)  # Should not raise an error

    def test_with_invalid_type(self):
        row = {"type": "unsupported_type"}
        with self.assertRaises(InvalidDataModelError) as context:
            validate_variable_type(row)
        self.assertTrue(
            "The row must have a 'type' field with a valid value."
            in str(context.exception)
        )

    def test_with_legacy_type(self):
        for legacy_type in ["real", "integer", "text"]:
            with self.assertRaises(InvalidDataModelError):
                validate_variable_type({"type": legacy_type})

    def test_missing_type_field(self):
        row = {"name": "Variable without type"}
        with self.assertRaises(InvalidDataModelError) as context:
            validate_variable_type(row)
        self.assertTrue(
            "The row must have a 'type' field with a valid value."
            in str(context.exception)
        )
