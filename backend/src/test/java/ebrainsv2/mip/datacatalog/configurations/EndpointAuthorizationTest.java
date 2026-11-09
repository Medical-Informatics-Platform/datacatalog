package ebrainsv2.mip.datacatalog.configurations;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Role matrix for every state-changing endpoint. The filter chain only demands a login for
 * non-GET requests, so the role check lives in each handler's {@code @PreAuthorize}; a write
 * endpoint added or edited without one fails here instead of reaching any logged-in user.
 */
public class EndpointAuthorizationTest {

    private static final String DOMAIN_EXPERT = "hasAuthority('DC_DOMAIN_EXPERT')";
    private static final String ADMIN = "hasAuthority('DC_ADMIN')";

    private static final Map<String, String> WRITE_ENDPOINTS = Map.of(
            "POST /datamodels", DOMAIN_EXPERT,
            "POST /datamodels/import", DOMAIN_EXPERT,
            "PUT /datamodels/{uuid}", DOMAIN_EXPERT,
            "PUT /datamodels/{uuid}/excel", DOMAIN_EXPERT,
            "DELETE /datamodels/{uuid}", DOMAIN_EXPERT,
            "POST /datamodels/{uuid}/release", DOMAIN_EXPERT,
            "POST /federations", ADMIN,
            "PUT /federations/{code}", ADMIN,
            "DELETE /federations/{code}", ADMIN);

    @Test
    void everyWriteEndpointRequiresItsRole() throws ClassNotFoundException {
        assertEquals(new TreeMap<>(WRITE_ENDPOINTS), writeEndpointsInTheCodebase());
    }

    private static Map<String, String> writeEndpointsInTheCodebase() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        Map<String, String> endpoints = new TreeMap<>();
        for (BeanDefinition definition : scanner.findCandidateComponents("ebrainsv2.mip.datacatalog")) {
            Class<?> controller = Class.forName(definition.getBeanClassName());
            String basePath = controller.getAnnotation(RequestMapping.class).value()[0];

            for (Method handler : controller.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(handler, RequestMapping.class);
                if (mapping == null || isReadOnly(mapping)) {
                    continue;
                }
                PreAuthorize preAuthorize = handler.getAnnotation(PreAuthorize.class);
                String method = mapping.method().length == 0 ? "ANY" : mapping.method()[0].name();
                endpoints.put(method + " " + join(basePath, mapping.value()),
                        preAuthorize == null ? "no @PreAuthorize" : preAuthorize.value());
            }
        }
        return endpoints;
    }

    private static boolean isReadOnly(RequestMapping mapping) {
        return mapping.method().length == 1 && mapping.method()[0] == RequestMethod.GET;
    }

    private static String join(String basePath, String[] paths) {
        if (paths.length == 0 || paths[0].isEmpty()) {
            return basePath;
        }
        return basePath + "/" + paths[0].replaceFirst("^/", "");
    }
}
