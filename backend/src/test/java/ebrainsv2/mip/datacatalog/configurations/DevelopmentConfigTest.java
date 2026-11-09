package ebrainsv2.mip.datacatalog.configurations;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.PropertySourcesPropertyResolver;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;

import java.io.IOException;
import java.util.List;
import java.util.Map;

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

    /**
     * The container image ships {@code config/application.yml} and lets Spring resolve its
     * placeholders from the environment that Compose and the Helm chart set.
     */
    @Test
    void containerConfigResolvesEveryInjectedValueFromTheEnvironment() throws IOException {
        MutablePropertySources sources = new MutablePropertySources();
        sources.addFirst(new MapPropertySource("environment", Map.of(
                "DB_URL", "jdbc:postgresql://db:5432/datacatalog",
                "PUBLIC_HOST", "https://catalog.example.org",
                "DQT_URL", "http://data-quality-tool:8000")));
        sources.addLast(new YamlPropertySourceLoader()
                .load("container", new FileSystemResource("config/application.yml"))
                .get(0));
        PropertySourcesPropertyResolver resolver = new PropertySourcesPropertyResolver(sources);

        for (String key : INJECTED_PROPERTIES) {
            String value = resolver.getProperty(key);
            assertTrue(value != null && !value.isBlank(), "missing property in config/application.yml: " + key);
        }
        assertEquals("1", resolver.getProperty("authentication.enabled"), "authentication stays on by default");
        assertEquals("jdbc:postgresql://db:5432/datacatalog", resolver.getProperty("spring.flyway.url"));
        assertEquals("https://catalog.example.org/auth-callback", resolver.getProperty("app.frontend.auth-callback-url"));
        assertEquals("http://data-quality-tool:8000/excel-to-json",
                resolver.getProperty("app.data_quality_tool.excel-to-json-url"));
    }

    private static PropertySource<?> developmentConfig() throws IOException {
        return new YamlPropertySourceLoader()
                .load("application.yml", new ClassPathResource("application.yml"))
                .get(0);
    }
}
