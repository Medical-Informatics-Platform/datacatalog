package ebrainsv2.mip.datacatalog.configurations;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the development config in {@code src/main/resources/application.yml}. Nothing in the suite
 * boots an application context, so a key injected with {@code @Value} but missing from that file
 * only fails when somebody runs {@code mvn spring-boot:run}.
 */
public class DevelopmentConfigTest {

    private static final List<String> INJECTED_PROPERTIES = List.of(
            "authentication.enabled",
            "authentication.domain_expert",
            "app.frontend.base-url",
            "app.frontend.auth-callback-url",
            "app.data_quality_tool.excel-to-json-url",
            "app.data_quality_tool.json-to-excel-url",
            "app.data_quality_tool.validate-json-url");

    @Test
    void everyInjectedValueIsDefinedForHostLocalRuns() throws IOException {
        PropertySource<?> config = developmentConfig();

        for (String key : INJECTED_PROPERTIES) {
            Object value = config.getProperty(key);
            assertTrue(value != null && !String.valueOf(value).isBlank(),
                    "missing property in application.yml: " + key);
        }
    }

    @Test
    void hostLocalRunsSkipKeycloakLikeTheComposeDefault() throws IOException {
        assertEquals("0", String.valueOf(developmentConfig().getProperty("authentication.enabled")));
    }

    private static PropertySource<?> developmentConfig() throws IOException {
        return new YamlPropertySourceLoader()
                .load("application.yml", new ClassPathResource("application.yml"))
                .get(0);
    }
}
