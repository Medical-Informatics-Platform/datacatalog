import unittest

from validator.json_validator import validate_common_data_element, InvalidDataModelError


class TestValidateCommonDataElement(unittest.TestCase):
    def test_valid_common_data_element_nominal(self):
        # Test a valid nominal common data element with enumerations
        cde = {
            "code": "001",
            "type": "nominal",
            "enumerations": ["value1", "value2"],
        }
        path = "/test/nominal"
        # Should not raise an exception
        validate_common_data_element(cde, path)

    def test_missing_required_fields(self):
        # Test CDE missing one or more required fields
        cde_incomplete = {"code": "002"}
        path = "/test/missing_fields"
        with self.assertRaises(InvalidDataModelError):
            validate_common_data_element(cde_incomplete, path)

    def test_invalid_type(self):
        # Test CDE with an invalid type
        cde_invalid_type = {
            "code": "003",
            "type": "undefined_type",
        }
        path = "/test/invalid_type"
        with self.assertRaises(InvalidDataModelError):
            validate_common_data_element(cde_invalid_type, path)

    def test_legacy_types_are_rejected(self):
        for legacy_type in ["real", "integer", "text"]:
            with self.assertRaises(InvalidDataModelError):
                validate_common_data_element(
                    {"code": "004", "type": legacy_type}, "/test/legacy"
                )

    def test_numerical_with_enumerations(self):
        cde = {"code": "004", "type": "continuous", "enumerations": ["a", "b"]}
        with self.assertRaisesRegex(
            InvalidDataModelError, "cannot have 'enumerations'"
        ):
            validate_common_data_element(cde, "/test/numerical_enumerations")

    def test_categorical_with_range(self):
        cde = {"code": "004", "type": "ordinal", "enumerations": ["a"], "minValue": 0}
        with self.assertRaisesRegex(InvalidDataModelError, "cannot have 'minValue'"):
            validate_common_data_element(cde, "/test/categorical_range")

    def test_nominal_and_ordinal_without_enumerations_are_free_text(self):
        for variable_type in ["nominal", "ordinal"]:
            validate_common_data_element(
                {"code": "005", "type": variable_type}, "/test/free_text"
            )

    def test_binary_requires_two_enumerations(self):
        for enumerations in [None, ["a"], ["a", "b", "c"]]:
            cde = {"code": "005", "type": "binary", "enumerations": enumerations}
            with self.assertRaisesRegex(InvalidDataModelError, "exactly two"):
                validate_common_data_element(cde, "/test/binary")
        validate_common_data_element(
            {"code": "005", "type": "binary", "enumerations": ["a", "b"]},
            "/test/binary",
        )

    def test_discrete_requires_whole_number_range(self):
        cde = {"code": "005", "type": "discrete", "minValue": 0.5, "maxValue": 3}
        with self.assertRaisesRegex(InvalidDataModelError, "whole-number"):
            validate_common_data_element(cde, "/test/discrete")
        validate_common_data_element(
            {"code": "005", "type": "discrete", "minValue": 0, "maxValue": 3},
            "/test/discrete",
        )

    def test_minValue_greater_than_maxValue(self):
        # Test CDE with minValue greater than maxValue
        cde_invalid_range = {
            "code": "006",
            "type": "continuous",
            "minValue": 10,
            "maxValue": 5,
        }
        path = "/test/invalid_range"
        with self.assertRaises(InvalidDataModelError):
            validate_common_data_element(cde_invalid_range, path)
