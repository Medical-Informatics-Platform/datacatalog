package ebrainsv2.mip.datacatalog.datamodel;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class CommonDataElementDTOTest {

    private static final List<CommonDataElementDTO.EnumerationDTO> TWO = List.of(
            new CommonDataElementDTO.EnumerationDTO("0", "No"),
            new CommonDataElementDTO.EnumerationDTO("1", "Yes"));

    private static CommonDataElementDTO cde(String type, List<CommonDataElementDTO.EnumerationDTO> enumerations,
                                            Integer minValue, Integer maxValue) {
        return new CommonDataElementDTO("var", "Var", null, enumerations, minValue, maxValue, type, null, null);
    }

    @Test
    void acceptsTheFiveVariableTypes() {
        assertDoesNotThrow(() -> cde("continuous", null, 0, 10));
        assertDoesNotThrow(() -> cde("discrete", null, null, null));
        assertDoesNotThrow(() -> cde("nominal", null, null, null));
        assertDoesNotThrow(() -> cde("ordinal", TWO.subList(0, 1), null, null));
        assertDoesNotThrow(() -> cde("binary", TWO, null, null));
    }

    @Test
    void rejectsLegacyTypes() {
        for (String legacyType : List.of("real", "integer", "text")) {
            assertThrows(InvalidDataModelError.class, () -> cde(legacyType, null, null, null));
        }
    }

    @Test
    void rejectsValuesThatDoNotMatchTheType() {
        assertThrows(InvalidDataModelError.class, () -> cde("continuous", TWO, null, null));
        assertThrows(InvalidDataModelError.class, () -> cde("nominal", TWO, 0, 1));
        assertThrows(InvalidDataModelError.class, () -> cde("binary", TWO.subList(0, 1), null, null));
        assertThrows(InvalidDataModelError.class, () -> cde("binary", null, null, null));
    }
}
