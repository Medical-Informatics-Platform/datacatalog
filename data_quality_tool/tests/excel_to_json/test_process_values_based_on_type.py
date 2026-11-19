import unittest

from common_entities import InvalidDataModelError
from converter.excel_to_json import process_values_based_on_type


class TestProcessValuesBasedOnType(unittest.TestCase):
    def test_process_integer_range(self):
        row = {"type": "discrete", "range": "1-100"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 1)
        self.assertEqual(variable["maxValue"], 100)

    def test_process_min_max_invalid_type(self):
        row = {"type": "discrete", "range": "1.1-100.1"}
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Variable None declared as discrete but range bounds '1.1-100.1' are not whole numbers.",
            str(context.exception),
        )

    def test_process_nominal_enumerations(self):
        row = {
            "type": "nominal",
            "enumerations": '{"1", "label1"}, {"2", "label2"}',
        }
        variable = {}
        process_values_based_on_type(row, variable)
        expected_enumerations = [
            {"code": "1", "label": "label1"},
            {"code": "2", "label": "label2"},
        ]
        self.assertEqual(variable["enumerations"], expected_enumerations)

    def test_categorical_without_enumerations_raises_error(self):
        for variable_type in ["nominal", "ordinal", "binary"]:
            row = {"type": variable_type, "code": "V1"}
            with self.assertRaisesRegex(
                InvalidDataModelError, "Variable V1: .* requires enumerations"
            ):
                process_values_based_on_type(row, {})

    def test_process_ordinal_and_binary_enumerations(self):
        for variable_type, enumerations, expected in [
            (
                "ordinal",
                '{"1", "Low"}, {"2", "High"}',
                [{"code": "1", "label": "Low"}, {"code": "2", "label": "High"}],
            ),
            (
                "binary",
                '{"0", "No"}, {"1", "Yes"}',
                [{"code": "0", "label": "No"}, {"code": "1", "label": "Yes"}],
            ),
        ]:
            variable = {}
            process_values_based_on_type(
                {"type": variable_type, "enumerations": enumerations}, variable
            )
            self.assertEqual(variable["enumerations"], expected)

    def test_enumeration_codes_follow_exaflow_contract(self):
        for variable_type, enumerations, message in [
            ("binary", '{"0", "No"}', "exactly 0 and 1"),
            ("binary", '{"1", "No"}, {"2", "Yes"}', "exactly 0 and 1"),
            ("binary", '{"0", "No"}, {"1", "Yes"}, {"2", "Maybe"}', "exactly 0 and 1"),
            ("nominal", '{"0", "None"}, {"1", "Some"}', "starting from 1"),
            ("ordinal", '{"0", "None"}, {"1", "Mild"}', "starting from 1"),
            ("nominal", '{"a", "A"}', "integer enumeration codes"),
        ]:
            row = {"type": variable_type, "code": "V1", "enumerations": enumerations}
            with self.assertRaisesRegex(InvalidDataModelError, message):
                process_values_based_on_type(row, {})

    def test_missing_range_leaves_bounds_unset(self):
        row = {"type": "continuous", "code": "V2"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertNotIn("minValue", variable)
        self.assertNotIn("maxValue", variable)

    def test_legacy_values_column_is_ignored(self):
        row = {"type": "discrete", "values": "1-100"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertNotIn("minValue", variable)
        self.assertNotIn("maxValue", variable)

        row = {
            "type": "nominal",
            "values": '{"1", "label1"}, {"2", "label2"}',
        }
        with self.assertRaisesRegex(InvalidDataModelError, "requires enumerations"):
            process_values_based_on_type(row, {})

    def test_integer_range_with_correct_conversion(self):
        row = {"type": "discrete", "range": "1-100"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 1)
        self.assertEqual(variable["maxValue"], 100)
        self.assertIsInstance(variable["minValue"], int)
        self.assertIsInstance(variable["maxValue"], int)

    def test_real_range_with_correct_conversion(self):
        row = {"type": "continuous", "range": "0.1-99.9"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 0.1)
        self.assertEqual(variable["maxValue"], 99.9)
        self.assertIsInstance(variable["minValue"], float)
        self.assertIsInstance(variable["maxValue"], float)

    def test_invalid_integer_range_raises_error(self):
        row = {"type": "discrete", "range": "not-an-int - 100", "code": "VInvalidInt"}
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Range values for variable VInvalidInt must be valid numbers but got 'not-an-int - 100'.",
            str(context.exception),
        )

    def test_invalid_real_range_raises_error(self):
        row = {
            "type": "continuous",
            "range": "0.1 - not-a-real",
            "code": "VInvalidReal",
        }
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Range values for variable VInvalidReal must be valid numbers but got '0.1 - not-a-real'.",
            str(context.exception),
        )

    def test_invalid_type_in_values_range_raises_error(self):
        row = {"type": "continuous", "range": "a-b", "code": "VInvalidReal"}
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Range values for variable VInvalidReal must be valid numbers but got 'a-b'.",
            str(context.exception),
        )
