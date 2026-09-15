import unittest

from error_reporting import (
    GENERIC_VALIDATION_ERROR,
    MAX_CLIENT_ERROR_LENGTH,
    client_error_message,
)

STACK_TRACE = (
    "Traceback (most recent call last):\n"
    '  File "/app/controller.py", line 42, in validate_json\n'
    "KeyError: 'csvFile'"
)


class TestClientErrorMessage(unittest.TestCase):
    def test_keeps_validation_report_unchanged(self):
        details = "On :dataset got: Missing value for required column 'name'."
        self.assertEqual(client_error_message(details), details)

    def test_keeps_data_model_path(self):
        details = "Missing required field 'code' in CommonDataElement at path: '/G1/G2/dataset'."
        self.assertEqual(client_error_message(details), details)

    def test_keeps_concept_path_hint(self):
        details = "ConceptPath format error: 'characters/characters/...' expected."
        self.assertEqual(client_error_message(details), details)

    def test_replaces_stack_trace_with_generic_message(self):
        self.assertEqual(client_error_message(STACK_TRACE), GENERIC_VALIDATION_ERROR)

    def test_replaces_frame_from_site_packages(self):
        details = '  File "/usr/lib/python3/site-packages/pandas/io/excel.py", line 1'
        self.assertEqual(client_error_message(details), GENERIC_VALIDATION_ERROR)

    def test_keeps_only_the_first_line(self):
        message = client_error_message(
            "Invalid Excel file format.\nSecond internal line"
        )
        self.assertEqual(message, "Invalid Excel file format.")

    def test_collapses_whitespace(self):
        self.assertEqual(
            client_error_message("  bad   type:\t\tnominal  "), "bad type: nominal"
        )

    def test_drops_control_characters(self):
        self.assertEqual(
            client_error_message("missing 'name' \x00\x1b[31m column"),
            "missing 'name' [31m column",
        )

    def test_keeps_quoted_and_accented_column_names(self):
        details = 'Column "Âge (années)" is missing the required meta sheet.'
        self.assertEqual(client_error_message(details), details)

    def test_bounds_length(self):
        message = client_error_message("x" * (MAX_CLIENT_ERROR_LENGTH * 2))
        self.assertEqual(len(message), MAX_CLIENT_ERROR_LENGTH)
        self.assertTrue(message.endswith("…"))


if __name__ == "__main__":
    unittest.main()
