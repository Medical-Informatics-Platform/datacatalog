package ebrainsv2.mip.datacatalog.federation;

import ebrainsv2.mip.datacatalog.datamodel.DataModelDAO;
import ebrainsv2.mip.datacatalog.datamodel.DataModelRepository;
import ebrainsv2.mip.datacatalog.utils.UserActionLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FederationServiceTest {

    @Mock
    private FederationRepository federationRepository;

    @Mock
    private DataModelRepository dataModelRepository;

    @Mock
    private UserActionLogger logger;

    private FederationService federationService;

    @BeforeEach
    void setUp() {
        federationService = new FederationService(federationRepository, dataModelRepository);
    }

    @Test
    void updateFederationLooksUpDataModelsByUuidNotString() {
        UUID pathologyId = UUID.fromString("28c0ff77-4102-4c48-8585-2d975b67934f");
        DataModelDAO pathology = new DataModelDAO();
        pathology.setUuid(pathologyId);
        pathology.setReleased(true);

        FederationDAO existing = new FederationDAO();
        existing.setCode("dementia");
        existing.setDataModels(List.of());

        when(federationRepository.findByCode("dementia")).thenReturn(Optional.of(existing));
        when(dataModelRepository.findAllById(List.of(pathologyId))).thenReturn(List.of(pathology));
        when(federationRepository.save(any(FederationDAO.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FederationDTO request = new FederationDTO(
                "dementia",
                "Dementia",
                "https://example.com",
                "description",
                6348,
                4,
                List.of(pathologyId)
        );

        federationService.updateFederation("dementia", request, logger);

        verify(dataModelRepository).findAllById(List.of(pathologyId));
        assertEquals(List.of(pathology), existing.getDataModels());
    }
}
