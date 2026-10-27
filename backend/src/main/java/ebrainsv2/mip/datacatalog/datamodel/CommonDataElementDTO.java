package ebrainsv2.mip.datacatalog.datamodel;


import java.util.List;
import java.util.Set;

public record CommonDataElementDTO(
        String code,
        String label,
        String description,
        List<EnumerationDTO> enumerations,
        Double minValue,
        Double maxValue,
        String type,
        String methodology,
        String units
) {
    public CommonDataElementDTO {
        validateField(code, "code", code);
        validateField(label, "label", code);
        validateField(type, "type", code);

        // Validate 'type' field against valid types
        if (!NUMERICAL_TYPES.contains(type) && !CATEGORICAL_TYPES.contains(type)) {
            throw new InvalidDataModelError("The CDE " + code + " has an invalid 'type'. Valid types are: "
                    + List.of("continuous", "discrete", "nominal", "ordinal", "binary"));
        }

        boolean hasEnumerations = enumerations != null && !enumerations.isEmpty();
        if (NUMERICAL_TYPES.contains(type) && hasEnumerations) {
            throw new InvalidDataModelError("The CDE " + code + " is " + type + " and cannot have enumerations.");
        }
        if (CATEGORICAL_TYPES.contains(type) && (minValue != null || maxValue != null)) {
            throw new InvalidDataModelError("The CDE " + code + " is " + type + " and cannot have minValue/maxValue.");
        }
        if ("binary".equals(type) && (!hasEnumerations || enumerations.size() != 2)) {
            throw new InvalidDataModelError("The CDE " + code + " is binary and must have exactly two enumerations.");
        }

        // Check minValue and maxValue values
        if (minValue != null && maxValue != null && minValue >= maxValue) {
            throw new InvalidDataModelError("The CDE " + code + " has minValue greater than or equal to maxValue.");
        }
        if ("discrete".equals(type) && (!isWholeNumber(minValue) || !isWholeNumber(maxValue))) {
            throw new InvalidDataModelError("The CDE " + code + " is discrete and its minValue/maxValue must be whole numbers.");
        }
    }
    
    private static final Set<String> NUMERICAL_TYPES = Set.of("continuous", "discrete");
    private static final Set<String> CATEGORICAL_TYPES = Set.of("nominal", "ordinal", "binary");

    private static boolean isWholeNumber(Double value) {
        return value == null || value % 1 == 0;
    }

    private static void validateField(Object field, String fieldName, String code) {
        if (field == null || (field instanceof String && ((String) field).isEmpty())) {
            throw new InvalidDataModelError(String.format("Element: '%s' is missing from the CDE %s", fieldName, code));
        }
    }
    
    public record EnumerationDTO(String code, String label) {
    }

}

