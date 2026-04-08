import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render only documentation and support links in resources', () => {
    const resourceLinks = Array.from(
      fixture.nativeElement.querySelectorAll('.footer-links a'),
    ) as HTMLAnchorElement[];

    expect(resourceLinks.length).toBe(2);

    const documentationLink = resourceLinks.find((link) => link.textContent?.trim() === 'Documentation');
    const supportLink = resourceLinks.find((link) => link.textContent?.trim() === 'Support');

    expect(documentationLink?.getAttribute('href')).toBe('https://github.com/Medical-Informatics-Platform/mip');
    expect(documentationLink?.getAttribute('target')).toBe('_blank');
    expect(documentationLink?.getAttribute('rel')).toBe('noopener noreferrer');

    expect(supportLink?.getAttribute('href')).toBe('mailto:mip@chuv.ch');

    expect(fixture.nativeElement.textContent).not.toContain('Privacy Policy');
    expect(fixture.nativeElement.textContent).not.toContain('Terms of Use');
  });

  it('should render the EU co-funding badge instead of the old Horizon copy', () => {
    const fundingFlag = fixture.nativeElement.querySelector('.footer-funding-flag') as HTMLImageElement | null;
    const fundingText = fixture.nativeElement.querySelector('.footer-funding') as HTMLElement | null;

    expect(fundingFlag?.getAttribute('src')).toBe('assets/home/eu-fund-logo.png');
    expect(fundingFlag?.getAttribute('alt')).toBe('European Union flag');

    expect(fundingText?.textContent).toContain('Co-funded by');
    expect(fundingText?.textContent).toContain('the European Union');
    expect(fixture.nativeElement.textContent).not.toContain('Horizon 2020 Framework Programme');
  });

  it('should use the updated CHUV mark in the partner row', () => {
    const chuvLogo = fixture.nativeElement.querySelector('.chuv-logo') as HTMLImageElement | null;

    expect(chuvLogo?.getAttribute('src')).toBe('assets/home/logo_chuv_mark.svg');
    expect(chuvLogo?.getAttribute('alt')).toBe('CHUV logo');
  });
});
