package ebrainsv2.mip.datacatalog.datamodel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ebrainsv2.mip.datacatalog.utils.Exceptions.BadRequestException;
import ebrainsv2.mip.datacatalog.utils.Exceptions.DataModelNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

import java.io.IOException;
import java.util.Map;

/**
 * Maps failures of {@link DataModelAPI} to {@code {"error": "<message>"}} so the UI can show what
 * went wrong. There is no catch-all: unexpected errors keep Spring's default 500 (detail stays in
 * the log), and security exceptions still reach Spring Security's 401/403 handling.
 */
@RestControllerAdvice(assignableTypes = DataModelAPI.class)
public class DataModelExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(DataModelExceptionHandler.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    static final String DQT_REJECTED_FALLBACK = "The file is not a valid data model.";
    static final String DQT_FAILED = "The data quality service could not process this file. "
            + "Check the file contents and try again, or contact an administrator.";
    static final String DQT_UNAVAILABLE = "The data quality service is unavailable. Try again later.";

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException e) {
        return respond(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(DataModelNotFoundException.class)
    ResponseEntity<Map<String, String>> notFound(DataModelNotFoundException e) {
        return respond(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<Map<String, String>> badRequest(BadRequestException e) {
        return respond(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /** Invalid data model JSON in a request body, e.g. a variable without {@code sql_type}. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> unreadableBody(HttpMessageNotReadableException e) {
        String reason = validationMessage(e);
        return respond(HttpStatus.BAD_REQUEST, reason != null ? reason : "The request body is not valid JSON.");
    }

    @ExceptionHandler({IllegalArgumentException.class, InvalidDataModelError.class})
    ResponseEntity<Map<String, String>> invalidInput(RuntimeException e) {
        String reason = validationMessage(e);
        return respond(HttpStatus.BAD_REQUEST, "Invalid input: " + (reason != null ? reason : e.getMessage()));
    }

    @ExceptionHandler(IOException.class)
    ResponseEntity<Map<String, String>> fileProblem(IOException e) {
        return respond(HttpStatus.UNPROCESSABLE_ENTITY, "File processing failed: " + e.getMessage());
    }

    /** The data quality tool answered with an error status. */
    @ExceptionHandler(HttpStatusCodeException.class)
    ResponseEntity<Map<String, String>> dataQualityToolRejected(HttpStatusCodeException e) {
        if (e.getStatusCode().is4xxClientError()) {
            return respond(HttpStatus.BAD_REQUEST, dqtError(e));
        }
        log.error("Data quality tool failed with {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
        return respond(HttpStatus.BAD_GATEWAY, DQT_FAILED);
    }

    @ExceptionHandler(ResourceAccessException.class)
    ResponseEntity<Map<String, String>> dataQualityToolDown(ResourceAccessException e) {
        log.error("Data quality tool not reachable", e);
        return respond(HttpStatus.SERVICE_UNAVAILABLE, DQT_UNAVAILABLE);
    }

    private static ResponseEntity<Map<String, String>> respond(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("error", message == null ? status.getReasonPhrase() : message));
    }

    /** The {@code error} text of the data quality tool's JSON body, which is written for users. */
    static String dqtError(HttpStatusCodeException e) {
        try {
            JsonNode error = MAPPER.readTree(e.getResponseBodyAsString()).path("error");
            if (error.isTextual() && !error.asText().isBlank()) {
                return error.asText();
            }
        } catch (IOException | RuntimeException ignored) {
            // not JSON: fall through to the generic text
        }
        return DQT_REJECTED_FALLBACK;
    }

    /** Message of the {@link InvalidDataModelError} behind a Jackson/conversion failure, or null. */
    static String validationMessage(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (t instanceof InvalidDataModelError) {
                return t.getMessage();
            }
        }
        return null;
    }
}
