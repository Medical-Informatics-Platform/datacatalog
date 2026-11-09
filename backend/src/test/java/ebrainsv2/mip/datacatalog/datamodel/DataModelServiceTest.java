package ebrainsv2.mip.datacatalog.datamodel;

import ebrainsv2.mip.datacatalog.utils.UserActionLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataModelServiceTest {

    @Mock
    private DataModelRepository dataModelRepository;

    @Mock
    private UserActionLogger logger;

    private DataModelService dataModelService;

    @BeforeEach
    void setUp() {
        dataModelService = new DataModelService(dataModelRepository);
        ReflectionTestUtils.setField(dataModelService, "domain_expert", "DC_DOMAIN_EXPERT");
    }

    @Test
    void anonymousCallersOnlySeeReleasedDataModels() {
        // Spring hands controllers a null Authentication for anonymous requests.
        dataModelService.listDataModels(null, null, logger);
        dataModelService.listDataModels(null, false, logger);

        verify(dataModelRepository, times(2)).findByReleased(true);
        verify(dataModelRepository, never()).findByReleased(false);
        verify(dataModelRepository, never()).findAll();
    }

    @Test
    void domainExpertsSeeEveryDataModel() {
        when(dataModelRepository.findAll()).thenReturn(List.of());

        dataModelService.listDataModels(new TestingAuthenticationToken("expert", null, "DC_DOMAIN_EXPERT"), null, logger);

        verify(dataModelRepository).findAll();
        verify(dataModelRepository, never()).findByReleased(anyBoolean());
    }
}
