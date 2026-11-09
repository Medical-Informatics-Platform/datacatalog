package ebrainsv2.mip.datacatalog.datamodel;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class DataModelConverterUploadTest {

    private static final Path TEMP_DIR = Path.of(System.getProperty("java.io.tmpdir"));

    @Test
    void uploadIsStoredInTheTemporaryDirectoryNamedByTheServer() throws IOException {
        Path upload = DataModelConverter.createTempUpload("../../../../etc/passwd.xlsx");
        try {
            assertEquals(TEMP_DIR.toRealPath(), upload.getParent().toRealPath(),
                    "The client supplied file name must not steer the destination directory.");
            assertTrue(upload.getFileName().toString().startsWith("datacatalog-import-"),
                    "The client supplied file name must not steer the destination file name.");
            assertEquals(".xlsx", suffix(upload));
        } finally {
            Files.deleteIfExists(upload);
        }
    }

    @Test
    void ordinaryExcelExtensionIsKept() {
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix("Minimal Data Model.xlsx"));
        assertEquals(".xls", DataModelConverter.safeUploadSuffix("model.xls"));
    }

    @Test
    void unsafeOrMissingExtensionFallsBackToExcel() {
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix("../../etc/passwd"));
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix("model."));
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix("no-extension"));
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix("very.long.extensionlength"));
        assertEquals(".xlsx", DataModelConverter.safeUploadSuffix(null));
    }

    private static String suffix(Path path) {
        String name = path.getFileName().toString();
        return name.substring(name.lastIndexOf('.'));
    }
}
