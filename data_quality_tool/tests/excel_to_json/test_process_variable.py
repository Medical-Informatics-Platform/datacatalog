import unittest

from common_entities import InvalidDataModelError
from converter.excel_to_json import process_variable


class TestProcessVariable(unittest.TestCase):
    def test_process_nominal_variable(self):
        row = {
            "type": "nominal",
            "values": '{"code1", "label1"}, {"code2", "label2"}',
            "name": "Variable Name",
            "code": "VarCode",
        }
        expected_variable = {
            "label": "Variable Name",
            "code": "VarCode",
            "type": "nominal",
            "enumerations": [
                {"code": "code1", "label": "label1"},
                {"code": "code2", "label": "label2"},
            ],
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)

    def test_process_integer_variable(self):
        row = {
            "type": "discrete",
            "values": "1-100",
            "name": "Integer Variable",
            "code": "IntVar",
        }
        expected_variable = {
            "label": "Integer Variable",
            "code": "IntVar",
            "type": "discrete",
            "minValue": 1,
            "maxValue": 100,
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)

    def test_invalid_type_raises_error(self):
        row = {
            "type": "undefined",
            "name": "Invalid Type Variable",
            "code": "InvalidTypeVar",
        }
        with self.assertRaises(InvalidDataModelError):
            process_variable(row)

    def test_process_real_variable_with_range(self):
        row = {
            "type": "continuous",
            "values": "0.01-99.99",
            "name": "Real Variable",
            "code": "RealVar",
            "description": "A real number variable",
        }
        expected_variable = {
            "label": "Real Variable",
            "code": "RealVar",
            "type": "continuous",
            "minValue": 0.01,
            "maxValue": 99.99,
            "description": "A real number variable",
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)

    def test_process_text_variable(self):
        row = {
            "type": "nominal",
            "name": "Text Variable",
            "code": "TextVar",
            "description": "A text variable",
        }
        expected_variable = {
            "label": "Text Variable",
            "code": "TextVar",
            "type": "nominal",
            "description": "A text variable",
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)

    def test_variable_with_missing_values_field(self):
        row = {"type": "binary", "name": "Binary Variable", "code": "BinaryVar"}
        with self.assertRaises(InvalidDataModelError) as context:
            process_variable(row)
        self.assertIn(
            "Variable BinaryVar declared as binary must have exactly two values",
            str(context.exception),
        )

    def test_variable_with_optional_fields_missing(self):
        row = {"type": "discrete", "values": "1-100", "code": "IntVar"}
        expected_variable = {
            "code": "IntVar",
            "type": "discrete",
            "minValue": 1,
            "maxValue": 100,
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)
        self.assertNotIn("label", result_variable)

    def test_process_variable_with_additional_fields(self):
        row = {
            "type": "continuous",
            "values": "10.5-20.5",
            "name": "Additional Field Variable",
            "code": "AddFieldVar",
            "additional": "Extra info",
        }
        expected_variable = {
            "label": "Additional Field Variable",
            "code": "AddFieldVar",
            "type": "continuous",
            "minValue": 10.5,
            "maxValue": 20.5,
        }
        result_variable = process_variable(row)
        self.assertEqual(result_variable, expected_variable)
        self.assertNotIn("additional", result_variable)

    def test_nominal_with_range_instead_of_enumerations(self):
        row = {
            "type": "nominal",
            "values": "1-100",
            "name": "Incorrect Nominal Variable",
            "code": "IncorrNomVar",
        }
        with self.assertRaises(InvalidDataModelError) as context:
            process_variable(row)
        self.assertEqual(
            """Nominal values format error: '{"code", "label"}, {"code", "label"}' expected but got 1-100.""",
            str(context.exception),
        )
