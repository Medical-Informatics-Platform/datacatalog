import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FederationCardComponent } from './federation-card.component';

describe('FederationCardComponent', () => {
  let fixture: ComponentFixture<FederationCardComponent>;
  let component: FederationCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FederationCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FederationCardComponent);
    component = fixture.componentInstance;
    component.federation = {
      code: 'fed-1',
      title: 'Federation One',
      url: 'https://example.com',
      description: 'A federation used for testing the delete action.',
      dataModelIds: [],
      pathologies: [],
      institutions: '1',
      records: '42',
    };
    component.isAdmin = true;
    fixture.detectChanges();
  });

  it('should emit deleteFederation when the delete button is clicked', () => {
    spyOn(component.deleteFederation, 'emit');

    const deleteButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.icon-btn.delete');

    deleteButton?.click();

    expect(component.deleteFederation.emit).toHaveBeenCalledWith('fed-1');
  });
});
