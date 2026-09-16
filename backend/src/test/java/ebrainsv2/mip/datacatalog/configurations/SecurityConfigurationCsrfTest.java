package ebrainsv2.mip.datacatalog.configurations;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

public class SecurityConfigurationCsrfTest {

    private static final String COOKIE_NAME = "MIP-XSRF-TOKEN";
    private static final String HEADER_NAME = "X-MIP-XSRF-TOKEN";

    @Test
    void tokenIsStoredInAJavascriptReadableCookieOnTheRootPath() {
        CookieCsrfTokenRepository csrfTokenRepository = SecurityConfiguration.csrfTokenRepository();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(request), request, response);

        String serialized = serializedCookies(response);
        assertTrue(serialized.contains(COOKIE_NAME + "="), "CSRF cookie missing: " + serialized);
        assertTrue(serialized.contains("Path=/"), "cookie must be sent for every path: " + serialized);
        assertFalse(serialized.contains("HttpOnly"), "the Angular interceptor must be able to read it: " + serialized);
    }

    @Test
    void cookieIsReadBackIntoTheHeaderExpectedFromTheClient() {
        CookieCsrfTokenRepository csrfTokenRepository = SecurityConfiguration.csrfTokenRepository();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(COOKIE_NAME, "csrf-token-value"));

        CsrfToken token = csrfTokenRepository.loadToken(request);

        assertNotNull(token, "the token must be loaded from the double-submit cookie");
        assertEquals(HEADER_NAME, token.getHeaderName());
    }

    @Test
    void angularBootstrapIsConfiguredWithTheSameCookieAndHeader() throws IOException {
        Path bootstrapScript = angularBootstrapScript();
        assumeTrue(bootstrapScript != null, "frontend/src/main.ts is not part of this checkout");

        String bootstrap = Files.readString(bootstrapScript);

        assertTrue(bootstrap.contains("cookieName: '" + COOKIE_NAME + "'"), "unrelated XSRF cookie in " + bootstrapScript);
        assertTrue(bootstrap.contains("headerName: '" + HEADER_NAME + "'"), "unrelated XSRF header in " + bootstrapScript);
    }

    private static String serializedCookies(MockHttpServletResponse response) {
        StringBuilder serialized = new StringBuilder();
        for (String header : response.getHeaders("Set-Cookie")) {
            serialized.append(header).append('\n');
        }
        for (Cookie cookie : response.getCookies()) {
            serialized.append(cookie.getName()).append('=').append(cookie.getValue())
                    .append("; Path=").append(cookie.getPath());
            if (cookie.isHttpOnly()) {
                serialized.append("; HttpOnly");
            }
            serialized.append('\n');
        }
        return serialized.toString();
    }

    private static Path angularBootstrapScript() {
        for (Path directory = Path.of("").toAbsolutePath(); directory != null; directory = directory.getParent()) {
            Path candidate = directory.resolve(Path.of("frontend", "src", "main.ts"));
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
        }
        return null;
    }
}
