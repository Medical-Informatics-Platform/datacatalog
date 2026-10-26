import unittest

from common_entities import InvalidDataModelError
from converter.excel_to_json import process_values_based_on_type


class TestProcessValuesBasedOnType(unittest.TestCase):
    def test_process_integer_range(self):
        row = {"type": "discrete", "values": "1-100"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 1)
        self.assertEqual(variable["maxValue"], 100)

    def test_process_min_max_invalid_type(self):
        row = {"type": "discrete", "values": "1.1-100.1"}
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Variable None declared as discrete but range bounds '1.1-100.1' are not whole numbers.",
            str(context.exception),
        )

    def test_process_nominal_enumerations(self):
        row = {"type": "nominal", "values": '{"code1", "label1"}, {"code2", "label2"}'}
        variable = {}
        process_values_based_on_type(row, variable)
        expected_enumerations = [
            {"code": "code1", "label": "label1"},
            {"code": "code2", "label": "label2"},
        ]
        self.assertEqual(variable["enumerations"], expected_enumerations)

    def test_nominal_and_ordinal_without_values_have_no_enumerations(self):
        for variable_type in ["nominal", "ordinal"]:
            variable = {"code": "V1"}
            process_values_based_on_type({"type": variable_type}, variable)
            self.assertEqual(variable, {"code": "V1"})

    def test_process_ordinal_and_binary_enumerations(self):
        for variable_type in ["ordinal", "binary"]:
            row = {"type": variable_type, "values": '{"0", "No"}, {"1", "Yes"}'}
            variable = {}
            process_values_based_on_type(row, variable)
            self.assertEqual(
                variable["enumerations"],
                [{"code": "0", "label": "No"}, {"code": "1", "label": "Yes"}],
            )

    def test_binary_without_two_values_raises_error(self):
        for values in [
            None,
            '{"0", "No"}',
            '{"0", "No"}, {"1", "Yes"}, {"2", "Maybe"}',
        ]:
            row = {"type": "binary", "code": "code1", "values": values}
            with self.assertRaises(InvalidDataModelError) as context:
                process_values_based_on_type(row, {})
            self.assertIn(
                "Variable code1 declared as binary must have exactly two values",
                str(context.exception),
            )

    def test_missing_values_for_range_raises_error(self):
        row = {"type": "continuous", "code": "V2"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertNotIn("minValue", variable)
        self.assertNotIn("maxValue", variable)

    def test_integer_range_with_correct_conversion(self):
        row = {"type": "discrete", "values": "1-100"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 1)
        self.assertEqual(variable["maxValue"], 100)
        self.assertIsInstance(variable["minValue"], int)
        self.assertIsInstance(variable["maxValue"], int)

    def test_real_range_with_correct_conversion(self):
        row = {"type": "continuous", "values": "0.1-99.9"}
        variable = {}
        process_values_based_on_type(row, variable)
        self.assertEqual(variable["minValue"], 0.1)
        self.assertEqual(variable["maxValue"], 99.9)
        self.assertIsInstance(variable["minValue"], float)
        self.assertIsInstance(variable["maxValue"], float)

    def test_invalid_integer_range_raises_error(self):
        row = {"type": "discrete", "values": "not-an-int - 100", "code": "VInvalidInt"}
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
            "values": "0.1 - not-a-real",
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
        row = {"type": "continuous", "values": "a-b", "code": "VInvalidReal"}
        variable = {}
        with self.assertRaises(InvalidDataModelError) as context:
            process_values_based_on_type(row, variable)
        self.assertIn(
            "Range values for variable VInvalidReal must be valid numbers but got 'a-b'.",
            str(context.exception),
        )
