package ebrainsv2.mip.datacatalog.datamodel;

import ebrainsv2.mip.datacatalog.utils.UserActionLogger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import static ebrainsv2.mip.datacatalog.datamodel.DataModelConverter.convertDataModelDTOToExcel;
import static ebrainsv2.mip.datacatalog.datamodel.DataModelConverter.convertExcelToDataModelDTO;
import static ebrainsv2.mip.datacatalog.datamodel.DataModelValidator.validateJson;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Handlers let exceptions propagate; {@link DataModelExceptionHandler} turns them into
 * {@code {"error": "<message>"}} responses with a fitting status.
 */
@RestController
@RequestMapping(value = "/datamodels", produces = APPLICATION_JSON_VALUE)
public class DataModelAPI {
    private final DataModelService dataModelService;

    @Value("${app.data_quality_tool.json-to-excel-url}")
    private String dqtJsonToExcelUrl;

    @Value("${app.data_quality_tool.excel-to-json-url}")
    private String dqtExcelToJsonUrl;

    @Value("${app.data_quality_tool.validate-json-url}")
    private String dqtValidateJsonUrl;

    public DataModelAPI(DataModelService dataModelService) {
        this.dataModelService = dataModelService;
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @PostMapping("import")
    public ResponseEntity<?> importDataModelViaExcel(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("version") String version,
            @RequestParam("longitudinal") boolean longitudinal) throws IOException {
        UserActionLogger logger = new UserActionLogger(authentication, "POST /datamodels/import");

        DataModelDTO dataModelDTO = convertExcelToDataModelDTO(this.dqtExcelToJsonUrl, file, version, longitudinal);
        DataModelDTO createdDataModel = dataModelService.createDataModel(dataModelDTO, logger);
        return new ResponseEntity<>(createdDataModel, HttpStatus.CREATED);
    }

    @GetMapping("{uuid}/export")
    public ResponseEntity<?> exportDataModelAsExcel(Authentication authentication, @PathVariable String uuid) throws IOException {
        UserActionLogger logger = new UserActionLogger(authentication, "GET /datamodels/" + uuid + "/export");
        DataModelDTO dataModel = dataModelService.getDataModel(authentication, uuid, logger);

        ByteArrayResource resource = convertDataModelDTOToExcel(this.dqtJsonToExcelUrl, dataModel);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=data-model.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }

    @GetMapping()
    public ResponseEntity<?> listDataModels(
            Authentication authentication,
            @RequestParam(name = "released", required = false) Boolean released) {
        UserActionLogger logger = new UserActionLogger(authentication, "GET /datamodels/");
        List<DataModelDTO> dataModels = dataModelService.listDataModels(authentication, released, logger);
        return new ResponseEntity<>(dataModels, HttpStatus.OK);
    }

    @GetMapping("{uuid}")
    public ResponseEntity<?> getDataModel(Authentication authentication, @PathVariable String uuid) {
        UserActionLogger logger = new UserActionLogger(authentication, "GET /datamodels/" + uuid);
        DataModelDTO dataModel = dataModelService.getDataModel(authentication, uuid, logger);
        return new ResponseEntity<>(dataModel, HttpStatus.OK);
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @PostMapping()
    public ResponseEntity<?> createDataModel(Authentication authentication, @RequestBody DataModelDTO dataModelDTO) throws IOException {
        UserActionLogger logger = new UserActionLogger(authentication, "POST /datamodels");
        validateJson(this.dqtValidateJsonUrl, dataModelDTO);
        DataModelDTO createdDataModel = dataModelService.createDataModel(dataModelDTO, logger);
        return new ResponseEntity<>(createdDataModel, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @PutMapping("{uuid}")
    public ResponseEntity<?> updateDataModel(Authentication authentication, @PathVariable String uuid, @RequestBody DataModelDTO dataModelDTO) throws IOException {
        UserActionLogger logger = new UserActionLogger(authentication, "PUT /datamodels/" + uuid);
        validateJson(this.dqtValidateJsonUrl, dataModelDTO);
        DataModelDTO updatedDataModel = dataModelService.updateDataModel(uuid, dataModelDTO, logger);
        return new ResponseEntity<>(updatedDataModel, HttpStatus.OK);
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @PutMapping("{uuid}/excel")
    public ResponseEntity<?> updateDataModelViaExcel(
            Authentication authentication,
            @PathVariable String uuid,
            @RequestParam("file") MultipartFile file,
            @RequestParam("version") String version,
            @RequestParam("longitudinal") boolean longitudinal) throws IOException {
        UserActionLogger logger = new UserActionLogger(authentication, "PUT /datamodels/" + uuid + "/excel");
        DataModelDTO dataModelDTO = convertExcelToDataModelDTO(this.dqtExcelToJsonUrl, file, version, longitudinal);
        DataModelDTO updatedDataModel = dataModelService.updateDataModel(uuid, dataModelDTO, logger);
        return new ResponseEntity<>(updatedDataModel, HttpStatus.OK);
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @DeleteMapping("{uuid}")
    public ResponseEntity<?> deleteDataModel(Authentication authentication, @PathVariable String uuid) {
        UserActionLogger logger = new UserActionLogger(authentication, String.format("%s /datamodels/%s", "DELETE", uuid));
        dataModelService.deleteDataModel(uuid, logger);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PreAuthorize("hasAuthority('DC_DOMAIN_EXPERT')")
    @PostMapping("{uuid}/release")
    public ResponseEntity<?> releaseDataModel(Authentication authentication, @PathVariable String uuid) {
        UserActionLogger logger = new UserActionLogger(authentication, "POST /datamodels/" + uuid + "/release");
        dataModelService.releaseDataModel(uuid, logger);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
