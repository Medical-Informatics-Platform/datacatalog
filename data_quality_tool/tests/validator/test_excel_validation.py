import unittest

import pandas as pd

from common_entities import (
    REQUIRED_COLUMNS,
    EXCEL_COLUMNS,
    REQUIRED_EXCEL_COLUMNS,
)
from validator.excel_validator import (
    validate_enumerations,
    InvalidDataModelError,
    validate_min_max,
    validate_concept_path,
    validate_variable,
    validate_excel,
)


class TestValidationFunctions(unittest.TestCase):
    def test_validate_enumeration_valid(self):
        validate_enumerations('{"1", "label1"}, {"2", "label2"}')

    def test_validate_enumeration_invalid(self):
        with self.assertRaises(InvalidDataModelError) as context:
            validate_enumerations("Invalid format")
        self.assertEqual(
            (
                'Enumerations format error: \'{"code", "label"}, {"code", "label"}\' '
                "expected but got Invalid format."
            ),
            str(context.exception),
        )

    def test_validate_min_max_valid(self):
        self.assertEqual((1.0, 2.0), validate_min_max("1-2"))

    def test_validate_min_max_invalid_format(self):
        with self.assertRaises(InvalidDataModelError) as context:
            validate_min_max("Invalid format")
        self.assertEqual(
            "Range must match format '<float or integer>-<float or integer>' but got 'Invalid format'.",
            str(context.exception),
        )

    def test_validate_min_max_invalid_logic(self):
        with self.assertRaises(InvalidDataModelError) as context:
            validate_min_max("2-1")
        self.assertEqual(
            "Min value must be smaller than max value min_str='2' and max_str='1'.",
            str(context.exception),
        )

    def test_validate_conceptPath_valid(self):
        self.assertIsNone(validate_concept_path("valid/format/here"))

    def test_validate_conceptPath_invalid(self):
        with self.assertRaises(InvalidDataModelError) as context:
            validate_concept_path("invalid//format")
        self.assertEqual(
            "ConceptPath format error: 'characters/characters/...' expected.",
            str(context.exception),
        )

    def test_validate_variable_missing_required_columns(self):
        row = {"name": "test", "code": "T01", "type": "nominal", "conceptPath": None}
        with self.assertRaises(InvalidDataModelError) as context:
            validate_variable(row)
        self.assertTrue("Missing value for required column" in str(context.exception))

    def test_validate_variable_with_min_max(self):
        row = {
            "name": "test",
            "code": "T01",
            "type": "discrete",
            "conceptPath": "valid/format",
            "range": "10-100",
        }
        validate_variable(row)

    def test_validate_variable_discrete_requires_whole_number_bounds(self):
        base = {"name": "test", "code": "T01", "conceptPath": "valid/format"}
        validate_variable({**base, "type": "continuous", "range": "1.5-2.5"})
        with self.assertRaises(InvalidDataModelError) as context:
            validate_variable({**base, "type": "discrete", "range": "1.5-2.5"})
        self.assertIn("requires whole-number bounds", str(context.exception))

    def test_validate_variable_invalid_type(self):
        row = {
            "name": "test",
            "code": "T01",
            "type": "invalid",
            "conceptPath": "valid/format",
        }
        with self.assertRaises(InvalidDataModelError) as context:
            validate_variable(row)
        self.assertTrue("Invalid 'type'" in str(context.exception))

    def test_validate_variable_categorical_types(self):
        base = {"name": "test", "code": "T01", "conceptPath": "valid/format"}
        validate_variable({**base, "type": "nominal", "enumerations": '{"1","A"}'})
        validate_variable({**base, "type": "ordinal", "enumerations": '{"1","Low"}'})
        validate_variable(
            {**base, "type": "binary", "enumerations": '{"0","No"}, {"1","Yes"}'}
        )
        for variable_type, enumerations, message in [
            ("nominal", None, "requires enumerations"),
            ("binary", None, "requires enumerations"),
            ("binary", '{"0","No"}', "exactly 0 and 1"),
            ("binary", '{"1","No"}, {"2","Yes"}', "exactly 0 and 1"),
            ("nominal", '{"0","None"}, {"1","Some"}', "starting from 1"),
            ("ordinal", '{"low","Low"}', "integer enumeration codes"),
        ]:
            with self.assertRaises(InvalidDataModelError) as context:
                validate_variable(
                    {**base, "type": variable_type, "enumerations": enumerations}
                )
            self.assertIn(message, str(context.exception))

    def test_validate_variable_legacy_type(self):
        row = {"name": "test", "code": "T01", "type": "real", "conceptPath": "a/b"}
        with self.assertRaises(InvalidDataModelError):
            validate_variable(row)

    def test_validate_excel_valid(self):
        df = pd.DataFrame(
            [
                {
                    "name": "test1",
                    "code": "T01",
                    "type": "nominal",
                    "enumerations": '{"1", "label1"}, {"2", "label2"}',
                    "range": "",
                    "unit": "",
                    "description": "",
                    "comments": "",
                    "conceptPath": "valid/format",
                }
            ],
            columns=EXCEL_COLUMNS,
        )
        validate_excel(df)

    def test_validate_excel_optional_columns_absent(self):
        """A workbook with only the required Excel columns is valid."""
        df = pd.DataFrame(
            [
                {
                    "name": "test3",
                    "code": "T03",
                    "type": "nominal",
                    "enumerations": '{"1", "label1"}',
                    "range": "",
                    "unit": "",
                    "description": "",
                    "comments": "",
                    "conceptPath": "valid/format",
                }
            ],
            columns=REQUIRED_EXCEL_COLUMNS,
        )
        validate_excel(df)

    def test_validate_excel_extra_columns_tolerated(self):
        df = pd.DataFrame(
            [
                {
                    "name": "test4",
                    "code": "T04",
                    "type": "nominal",
                    "enumerations": '{"1", "label1"}',
                    "range": "",
                    "unit": "",
                    "description": "",
                    "comments": "",
                    "conceptPath": "valid/format",
                    "legacyValues": "(1-150)",
                }
            ]
        )
        validate_excel(df)

    def test_validate_excel_invalid_columns(self):
        df = pd.DataFrame(
            [
                {
                    "name": "test2",
                    "code": "T02",
                    "type": "nominal",
                    "conceptPath": "valid/format",
                }
            ]
        )  # Missing required columns
        with self.assertRaises(InvalidDataModelError) as context:
            validate_excel(df)
        self.assertIn(
            "Mismatch in Excel columns. Missing columns",
            str(context.exception),
        )

    def test_valid_enumeration(self):
        """Test that a valid enumeration does not raise an error."""
        valid_values = '{"1", "label1"}, {"2", "label2"}'
        validate_enumerations(valid_values)

    def test_valid_enumeration_with_spaces(self):
        """Test that a valid enumeration does not raise an error."""
        valid_values = '{"1","label1"},{"2","label2"}'
        validate_enumerations(valid_values)

    def test_invalid_format_enumeration(self):
        """Test that an invalid format raises the correct error."""
        invalid_values = "Invalid format"
        with self.assertRaises(InvalidDataModelError) as context:
            validate_enumerations(invalid_values)
        self.assertIn("Enumerations format error", str(context.exception))

    def test_duplicate_codes_enumeration(self):
        """Test that duplicate codes raise the correct error."""
        duplicate_values = '{"1", "label1"}, {"1", "label2"}'
        with self.assertRaises(InvalidDataModelError) as context:
            validate_enumerations(duplicate_values)
        self.assertIn("Duplicate codes found", str(context.exception))
