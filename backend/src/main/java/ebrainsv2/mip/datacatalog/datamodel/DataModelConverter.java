package ebrainsv2.mip.datacatalog.datamodel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DataModelConverter {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final String UPLOAD_PREFIX = "datacatalog-import-";
    private static final String DEFAULT_UPLOAD_SUFFIX = ".xlsx";
    // The suffix is selected from this list instead of being derived from the upload name, so no
    // part of the temporary path can be influenced by the client.
    private static final List<String> ALLOWED_UPLOAD_SUFFIXES = List.of(".xlsx", ".xls");

    public static ByteArrayResource convertDataModelDTOToExcel(String dqtJsonToExcelUrl, DataModelDTO dataModel) throws IOException {

        ObjectMapper objectMapper = new ObjectMapper();
        String json = objectMapper.writeValueAsString(dataModel);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> requestEntity = new HttpEntity<>(json, headers);

        RestTemplate restTemplate = new RestTemplate();
        byte[] excelData = restTemplate.postForObject(dqtJsonToExcelUrl, requestEntity, byte[].class);

        return new ByteArrayResource(excelData);
    }

    public static DataModelDTO convertExcelToDataModelDTO(String dqtExcelToJsonUrl,
                                                          MultipartFile file,
                                                          String version,
                                                          boolean longitudinal) throws IOException {
        // The upload name is supplied by the client, so the upload is stored under a generated
        // temporary path and only its extension is reused.
        Path convFile = createTempUpload(file.getOriginalFilename());
        try (InputStream upload = file.getInputStream()) {
            Files.copy(upload, convFile, StandardCopyOption.REPLACE_EXISTING);
        }

        try {
            // Setup the request to Flask API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new FileSystemResource(convFile));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(dqtExcelToJsonUrl, requestEntity, String.class);

            // Convert JSON response to a Map and add "longitudinal" and "version" fields
            ObjectMapper objectMapper = new ObjectMapper();
            Map dataMap = objectMapper.readValue(response.getBody(), Map.class);
            dataMap.put("longitudinal", longitudinal);
            dataMap.put("version", version);

            // Convert the modified Map back to JSON and map it to DataModelDTO
            return objectMapper.convertValue(dataMap, DataModelDTO.class);
        } finally {
            Files.deleteIfExists(convFile);
        }
    }

    static Path createTempUpload(String originalFilename) throws IOException {
        return Files.createTempFile(UPLOAD_PREFIX, safeUploadSuffix(originalFilename));
    }

    static String safeUploadSuffix(String originalFilename) {
        if (originalFilename == null) {
            return DEFAULT_UPLOAD_SUFFIX;
        }
        int lastDot = originalFilename.lastIndexOf('.');
        if (lastDot < 0) {
            return DEFAULT_UPLOAD_SUFFIX;
        }
        String candidate = originalFilename.substring(lastDot).toLowerCase(Locale.ROOT);
        for (String allowed : ALLOWED_UPLOAD_SUFFIXES) {
            if (allowed.equals(candidate)) {
                return allowed;
            }
        }
        return DEFAULT_UPLOAD_SUFFIX;
    }
    
    
    public static DataModelDTO convertToDataModelDTO(DataModelDAO dataModelDAO) {
        try {
            List<CommonDataElementDTO> variables = objectMapper.readValue(
                    dataModelDAO.getVariables(), new TypeReference<>() {
                    }
            );
            List<DataModelMetadataGroupDTO> groups = objectMapper.readValue(
                    dataModelDAO.getGroups(), new TypeReference<>() {
                    }
            );

            return new DataModelDTO(
                    dataModelDAO.getUuid(),
                    dataModelDAO.getCode(),
                    dataModelDAO.getVersion(),
                    dataModelDAO.getLabel(),
                    dataModelDAO.getLongitudinal(),
                    variables,
                    groups,
                    dataModelDAO.getReleased()
            );
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error in deserializing data from DataModelDAO: " + e.getMessage(), e);
        }
    }

    public static DataModelDAO dtoToDao(DataModelDTO dataModelDTO) {
        DataModelDAO dataModelDAO = new DataModelDAO();
        try {
            String variablesJson = objectMapper.writeValueAsString(dataModelDTO.variables());
            String groupsJson = objectMapper.writeValueAsString(dataModelDTO.groups());

            dataModelDAO.setUuid(dataModelDTO.uuid());
            dataModelDAO.setCode(dataModelDTO.code());
            dataModelDAO.setVersion(dataModelDTO.version());
            dataModelDAO.setLabel(dataModelDTO.label());
            dataModelDAO.setLongitudinal(Boolean.parseBoolean(String.valueOf(dataModelDTO.longitudinal())));
            dataModelDAO.setVariables(variablesJson);
            dataModelDAO.setGroups(groupsJson);
            dataModelDAO.setReleased(dataModelDTO.released() != null && dataModelDTO.released());

            return dataModelDAO;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error in serializing data to DataModelDAO: " + e.getMessage(), e);
        }
    }

}
