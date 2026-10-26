package db.migration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Map;

/**
 * Rewrites stored CDEs to the single 'type' contract of the variable-type refactor:
 * drops 'sql_type' and 'isCategorical', derives the new 'type' from them
 * (categorical -> nominal, real -> continuous, int -> discrete, text -> nominal)
 * and drops empty 'enumerations' lists.
 */
public class V1_1__MigrateCdeVariableTypes extends BaseJavaMigration {

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final Map<String, String> TYPE_PER_SQL_TYPE =
            Map.of("real", "continuous", "int", "discrete", "text", "nominal");
    private static final Map<String, String> TYPE_PER_LEGACY_TYPE =
            Map.of("real", "continuous", "integer", "discrete", "text", "nominal");

    @Override
    public void migrate(Context context) throws Exception {
        try (Statement select = context.getConnection().createStatement();
             ResultSet rows = select.executeQuery("SELECT uuid, variables, groups FROM data_model");
             PreparedStatement update = context.getConnection().prepareStatement(
                     "UPDATE data_model SET variables = ?, groups = ? WHERE uuid = ?")) {
            while (rows.next()) {
                update.setString(1, migrateJson(rows.getString("variables")));
                update.setString(2, migrateJson(rows.getString("groups")));
                update.setObject(3, rows.getObject("uuid"));
                update.addBatch();
            }
            update.executeBatch();
        }
    }

    static String migrateJson(String json) throws JsonProcessingException {
        if (json == null) {
            return null;
        }
        JsonNode node = objectMapper.readTree(json);
        migrateNode(node);
        return objectMapper.writeValueAsString(node);
    }

    private static void migrateNode(JsonNode node) {
        if (node.isArray()) {
            node.forEach(V1_1__MigrateCdeVariableTypes::migrateNode);
            return;
        }
        if (!node.isObject()) {
            return;
        }
        ObjectNode object = (ObjectNode) node;
        if (object.has("variables") || object.has("groups")) {
            migrateNode(object.path("variables"));
            migrateNode(object.path("groups"));
        } else {
            migrateVariable(object);
        }
    }

    private static void migrateVariable(ObjectNode variable) {
        JsonNode isCategorical = variable.remove("isCategorical");
        JsonNode sqlType = variable.remove("sql_type");
        String type = variable.path("type").asText();
        if (isCategorical != null && isCategorical.asBoolean()) {
            type = "nominal";
        } else if (sqlType != null && TYPE_PER_SQL_TYPE.containsKey(sqlType.asText())) {
            type = TYPE_PER_SQL_TYPE.get(sqlType.asText());
        } else {
            type = TYPE_PER_LEGACY_TYPE.getOrDefault(type, type);
        }
        variable.put("type", type);

        JsonNode enumerations = variable.get("enumerations");
        if (enumerations != null && enumerations.isArray() && enumerations.isEmpty()) {
            variable.remove("enumerations");
        }
    }
}
