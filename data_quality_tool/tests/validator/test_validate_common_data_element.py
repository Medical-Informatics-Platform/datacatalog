import unittest

from validator.json_validator import validate_common_data_element, InvalidDataModelError


class TestValidateCommonDataElement(unittest.TestCase):
    def test_valid_common_data_element_nominal(self):
        # Test a valid nominal common data element with enumerations
        cde = {
            "code": "001",
            "type": "nominal",
            "enumerations": [
                {"code": "1", "label": "value1"},
                {"code": "2", "label": "value2"},
            ],
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
        cde = {
            "code": "004",
            "type": "continuous",
            "enumerations": [{"code": "1", "label": "a"}, {"code": "2", "label": "b"}],
        }
        with self.assertRaisesRegex(
            InvalidDataModelError, "cannot have 'enumerations'"
        ):
            validate_common_data_element(cde, "/test/numerical_enumerations")

    def test_categorical_with_range(self):
        cde = {
            "code": "004",
            "type": "ordinal",
            "enumerations": [{"code": "1", "label": "a"}],
            "minValue": 0,
        }
        with self.assertRaisesRegex(InvalidDataModelError, "cannot have 'minValue'"):
            validate_common_data_element(cde, "/test/categorical_range")

    def test_categorical_requires_enumerations(self):
        for variable_type in ["nominal", "ordinal", "binary"]:
            with self.assertRaisesRegex(InvalidDataModelError, "requires enumerations"):
                validate_common_data_element(
                    {"code": "005", "type": variable_type}, "/test/no_enumerations"
                )

    def test_enumeration_codes_follow_exaflow_contract(self):
        def enums(*codes):
            return [{"code": code, "label": f"L{code}"} for code in codes]

        rejected = [
            ("binary", enums("0"), "exactly 0 and 1"),
            ("binary", enums("1", "2"), "exactly 0 and 1"),
            ("binary", enums("0", "1", "2"), "exactly 0 and 1"),
            ("nominal", enums("0", "1"), "starting from 1"),
            ("ordinal", enums("-1", "1"), "starting from 1"),
            ("nominal", enums("a", "b"), "integer enumeration codes"),
            ("ordinal", enums("01", "2"), "integer enumeration codes"),
            ("nominal", [{"code": True, "label": "x"}], "integer enumeration codes"),
        ]
        for variable_type, enumerations, message in rejected:
            cde = {"code": "005", "type": variable_type, "enumerations": enumerations}
            with self.assertRaisesRegex(InvalidDataModelError, message):
                validate_common_data_element(cde, "/test/codes")
        for variable_type, enumerations in [
            ("binary", enums("0", "1")),
            ("binary", [{"code": 1, "label": "a"}, {"code": 0, "label": "b"}]),
            ("nominal", enums("1", "2", "5")),
            ("ordinal", enums("1", "2", "3")),
        ]:
            validate_common_data_element(
                {"code": "005", "type": variable_type, "enumerations": enumerations},
                "/test/codes",
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
