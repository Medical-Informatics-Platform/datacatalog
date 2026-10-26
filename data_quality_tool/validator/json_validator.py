from common_entities import (
    CATEGORICAL_TYPES,
    NUMERICAL_TYPES,
    VARIABLE_TYPES,
    InvalidDataModelError,
)


def validate_common_data_element(cde, path):
    required_fields = ["code", "type"]

    for field in required_fields:
        if field not in cde:
            raise InvalidDataModelError(
                f"Missing required field '{field}' in CommonDataElement at path: '{path}'. Please ensure all required fields are provided."
            )
    type_key = cde.get("type")
    if type_key not in VARIABLE_TYPES:
        raise InvalidDataModelError(
            f"Invalid 'type' value '{type_key}' in CommonDataElement at path: '{path}'. Must be one of {list(VARIABLE_TYPES)}."
        )

    bounds = [cde[key] for key in ("minValue", "maxValue") if cde.get(key) is not None]
    if type_key in CATEGORICAL_TYPES and bounds:
        raise InvalidDataModelError(
            f"Categorical type '{type_key}' cannot have 'minValue' or 'maxValue' in CommonDataElement at path: '{path}'."
        )

    if type_key in NUMERICAL_TYPES and cde.get("enumerations"):
        raise InvalidDataModelError(
            f"Numerical type '{type_key}' cannot have 'enumerations' in CommonDataElement at path: '{path}'."
        )

    if type_key == "binary" and len(cde.get("enumerations") or []) != 2:
        raise InvalidDataModelError(
            f"'binary' CommonDataElement at path: '{path}' must have exactly two 'enumerations'."
        )

    if type_key == "discrete" and any(float(bound) % 1 for bound in bounds):
        raise InvalidDataModelError(
            f"'discrete' CommonDataElement at path: '{path}' must have whole-number 'minValue' and 'maxValue'."
        )

    if cde.get("minValue") is not None and cde.get("maxValue") is not None:
        if cde["minValue"] >= cde["maxValue"]:
            raise InvalidDataModelError(
                f"Invalid range: 'minValue' ({cde['minValue']}) is greater than or equal to 'maxValue' ({cde['maxValue']}) in CommonDataElement at path: '{path}'."
            )


def validate_group(group, path, seen_codes=None, seen_group_codes=None):
    if seen_codes is None:
        seen_codes = set()
    if seen_group_codes is None:
        seen_group_codes = set()

    group_code = group.get("code")
    if not group_code:
        raise InvalidDataModelError(
            f"Group at path: '{path}' is missing the 'code' field. Please provide a unique code for each group."
        )

    group_path_code = f"{path}/{group_code}"
    if group_path_code in seen_group_codes:
        raise InvalidDataModelError(
            f"Duplicate group code '{group_code}' detected at path: '{path}'. Group codes must be unique within the data model hierarchy."
        )
    seen_group_codes.add(group_path_code)

    updated_path = f"{path}/{group_code}"

    for variable in group.get("variables") or []:
        code = variable.get("code")
        variable_path_code = f"{updated_path}/{code}"
        if variable_path_code in seen_codes:
            raise InvalidDataModelError(
                f"Duplicate CommonDataElement code '{code}' detected in group '{group_code}' at path: '{updated_path}'. Ensure all variable codes are unique within their group."
            )
        seen_codes.add(variable_path_code)
        validate_common_data_element(variable, variable_path_code)

    for sub_group in group.get("groups") or []:
        validate_group(
            sub_group,
            updated_path,
            seen_codes,
            seen_group_codes,
        )


def validate_json(data_model):
    required_fields = ["code", "version", "label", "groups"]

    for field in required_fields:
        if field not in data_model:
            raise InvalidDataModelError(
                f"DataModel is missing the required field '{field}'. Please include it in the input JSON."
            )

    for field in ["code", "version", "label"]:
        if not isinstance(data_model[field], str) or not data_model[field].strip():
            raise InvalidDataModelError(
                f"'{field}' in DataModel must be a non-empty string. Current value: '{data_model[field]}'."
            )

    if "variables" not in data_model or data_model["variables"] is None:
        data_model["variables"] = []

    variables = data_model["variables"]
    if not isinstance(variables, list):
        raise InvalidDataModelError(
            "'variables' in DataModel must be a list of dictionaries."
        )
    elif not all(isinstance(var, dict) for var in variables):
        raise InvalidDataModelError(
            "'variables' in DataModel must only contain dictionaries. Found invalid entries."
        )

    if not isinstance(data_model["groups"], list):
        raise InvalidDataModelError(
            "'groups' in DataModel must be a list of dictionaries."
        )

    if not all(isinstance(group, dict) for group in data_model["groups"]):
        raise InvalidDataModelError(
            "'groups' in DataModel must only contain dictionaries. Found invalid entries."
        )

    seen_codes, seen_group_codes = set(), set()

    validate_group(data_model, "", seen_codes, seen_group_codes)

    if not contains_required_dataset(data_model["variables"], data_model["groups"]):
        raise InvalidDataModelError(
            "The DataModel must include at least one dataset CommonDataElement with code 'dataset', 'type' as 'nominal', and 'enumerations'."
        )

    if data_model.get("longitudinal"):
        validate_longitudinal_elements(
            data_model["variables"], data_model["groups"], path="DataModel"
        )


def contains_required_dataset(variables, groups, path=""):
    if variables is None:
        variables = []
    if groups is None:
        groups = []

    dataset_present = any(
        v.get("code") == "dataset"
        and v.get("type") == "nominal"
        and v.get("enumerations")
        for v in variables
    )
    if dataset_present:
        return True

    for i, group in enumerate(groups, start=1):
        if contains_required_dataset(
            group.get("variables") or [],
            group.get("groups") or [],
            path=f"{path}/groups[{i}]",
        ):
            return True

    return False


def validate_longitudinal_elements(variables, groups, path):
    if variables is None:
        variables = []
    if groups is None:
        groups = []

    subjectid_present = any(v.get("code") == "subjectid" for v in variables)
    visitid_present = any(v.get("code") == "visitid" for v in variables)

    if not subjectid_present or not visitid_present:
        for i, group in enumerate(groups, start=1):
            group_path = f"{path}/groups[{i}]"
            subjectid_present = subjectid_present or has_valid_cde_in_group(
                "subjectid", group, group_path
            )
            visitid_present = visitid_present or has_valid_cde_in_group(
                "visitid", group, group_path
            )

    if not subjectid_present:
        raise InvalidDataModelError(
            f"Missing 'subjectid' CommonDataElement required for longitudinal studies at path: '{path}'. Ensure a valid 'subjectid' is defined."
        )

    if not visitid_present:
        raise InvalidDataModelError(
            f"Missing 'visitid' CommonDataElement required for longitudinal studies at path: '{path}'. Ensure a valid 'visitid' is defined."
        )


def has_valid_cde_in_group(cde_code, group, path):
    valid_cde_found = any(
        v.get("code") == cde_code for v in (group.get("variables") or [])
    )
    if valid_cde_found:
        return True

    for i, nested_group in enumerate(group.get("groups") or [], start=1):
        if has_valid_cde_in_group(cde_code, nested_group, path=f"{path}/groups[{i}]"):
            return True

    return False
