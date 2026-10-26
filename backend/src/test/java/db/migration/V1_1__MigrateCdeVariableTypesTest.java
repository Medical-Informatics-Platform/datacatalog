package db.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

public class V1_1__MigrateCdeVariableTypesTest {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static void assertMigrated(String expected, String stored) throws Exception {
        assertEquals(objectMapper.readTree(expected),
                objectMapper.readTree(V1_1__MigrateCdeVariableTypes.migrateJson(stored)));
    }

    @Test
    void variablesTakeTheirTypeFromTheOldStorageFields() throws Exception {
        assertMigrated("""
                [{"code": "dataset", "type": "nominal", "enumerations": [{"code": "d", "label": "D"}]},
                 {"code": "age", "type": "discrete", "minValue": 0, "maxValue": 130},
                 {"code": "score", "type": "continuous"},
                 {"code": "subjectid", "type": "nominal"},
                 {"code": "mismatched", "type": "continuous"}]
                """, """
                [{"code": "dataset", "type": "nominal", "sql_type": "text", "isCategorical": true,
                  "enumerations": [{"code": "d", "label": "D"}]},
                 {"code": "age", "type": "integer", "sql_type": "int", "isCategorical": false,
                  "minValue": 0, "maxValue": 130},
                 {"code": "score", "type": "real", "sql_type": "real", "isCategorical": false,
                  "enumerations": []},
                 {"code": "subjectid", "type": "text", "sql_type": "text", "isCategorical": false},
                 {"code": "mismatched", "type": "nominal", "sql_type": "real", "isCategorical": false}]
                """);
    }

    @Test
    void nestedGroupVariablesAreMigrated() throws Exception {
        assertMigrated("""
                [{"code": "g", "label": "G", "variables": [{"code": "v", "type": "continuous"}],
                  "groups": [{"code": "h", "label": "H", "variables": [{"code": "w", "type": "nominal"}]}]}]
                """, """
                [{"code": "g", "label": "G", "variables": [{"code": "v", "type": "real", "sql_type": "real", "isCategorical": false}],
                  "groups": [{"code": "h", "label": "H", "variables": [{"code": "w", "type": "text"}]}]}]
                """);
    }

    @Test
    void alreadyMigratedAndNullJsonAreUnchanged() throws Exception {
        assertMigrated("[{\"code\": \"v\", \"type\": \"ordinal\"}]", "[{\"code\": \"v\", \"type\": \"ordinal\"}]");
        assertNull(V1_1__MigrateCdeVariableTypes.migrateJson(null));
    }
}
