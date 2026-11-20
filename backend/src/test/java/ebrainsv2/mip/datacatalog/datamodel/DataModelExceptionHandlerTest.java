package ebrainsv2.mip.datacatalog.datamodel;

import ebrainsv2.mip.datacatalog.utils.Exceptions.DataModelNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DataModelExceptionHandlerTest {

    private final DataModelExceptionHandler handler = new DataModelExceptionHandler();

    private static void assertError(HttpStatus status, String message, ResponseEntity<Map<String, String>> response) {
        assertEquals(status, response.getStatusCode());
        assertEquals(Map.of("error", message), response.getBody());
    }

    @Test
    void duplicateIsAConflictWithItsMessage() {
        assertError(HttpStatus.CONFLICT, "Data model with code: x and version: 1 already exists.",
                handler.conflict(new DataIntegrityViolationException("Data model with code: x and version: 1 already exists.")));
    }

    @Test
    void missingDataModelIsNotFound() {
        assertError(HttpStatus.NOT_FOUND, "no such model", handler.notFound(new DataModelNotFoundException("no such model")));
    }

    @Test
    void dataQualityToolValidationErrorIsShownToTheUser() {
        HttpClientErrorException dqt = HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
                new HttpHeaders(), "{\"error\": \"On :age got: Missing value for required column 'name'.\"}".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8);

        assertError(HttpStatus.BAD_REQUEST, "On :age got: Missing value for required column 'name'.",
                handler.dataQualityToolRejected(dqt));
    }

    @Test
    void dataQualityToolRejectionWithoutJsonFallsBackToGenericText() {
        HttpClientErrorException dqt = HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
                new HttpHeaders(), "<html>oops</html>".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);

        assertError(HttpStatus.BAD_REQUEST, DataModelExceptionHandler.DQT_REJECTED_FALLBACK,
                handler.dataQualityToolRejected(dqt));
    }

    @Test
    void dataQualityToolCrashIsABadGatewayWithoutInternals() {
        HttpServerErrorException dqt = HttpServerErrorException.create(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                new HttpHeaders(), "{\"error\": \"Internal server error\"}".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);

        assertError(HttpStatus.BAD_GATEWAY, DataModelExceptionHandler.DQT_FAILED, handler.dataQualityToolRejected(dqt));
    }

    @Test
    void unreachableDataQualityToolIsServiceUnavailable() {
        assertError(HttpStatus.SERVICE_UNAVAILABLE, DataModelExceptionHandler.DQT_UNAVAILABLE,
                handler.dataQualityToolDown(new ResourceAccessException("Connection refused", new IOException("refused"))));
    }

    @Test
    void jacksonWrappedValidationErrorShowsTheRealReason() {
        Exception wrapped = new IllegalArgumentException("Cannot construct instance of CommonDataElementDTO",
                new RuntimeException("problem", new InvalidDataModelError("Element: 'sql_type' is missing from the CDE dataset")));

        assertError(HttpStatus.BAD_REQUEST, "Invalid input: Element: 'sql_type' is missing from the CDE dataset",
                handler.invalidInput((RuntimeException) wrapped));
        assertNull(DataModelExceptionHandler.validationMessage(new RuntimeException("unrelated")));
    }
}
