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

  it('should render the EU co-funding item with the shared acknowledgement tooltip', () => {
    const fundingFlag = fixture.nativeElement.querySelector('.footer-funding-item-eu .footer-funding-flag') as HTMLImageElement | null;
    const fundingText = fixture.nativeElement.querySelector('.footer-funding-item-eu .footer-funding-box-name') as HTMLElement | null;
    const fundingTooltip = fixture.nativeElement.querySelector('.footer-funding-item-eu .footer-funding-tooltip') as HTMLElement | null;

    expect(fundingFlag?.getAttribute('src')).toBe('assets/footer/eu-flag.svg');
    expect(fundingFlag?.getAttribute('alt')).toBe('European Union flag');

    expect(fundingText?.textContent).toContain('European Union');
    expect(fundingTooltip?.textContent).toContain('Human Brain Project');
    expect(fundingTooltip?.textContent).toContain('EBRAINS 2.0');
    expect(fundingTooltip?.textContent).toContain('23.00638');
  });

  it('should render the SERI co-funding item with the shared acknowledgement tooltip', () => {
    const seriFlag = fixture.nativeElement.querySelector('.footer-funding-item-seri .seri-mark-flag') as HTMLElement | null;
    const seriText = fixture.nativeElement.querySelector('.footer-funding-item-seri .footer-funding-box-name-seri') as HTMLElement | null;
    const seriTooltip = fixture.nativeElement.querySelector('.footer-funding-item-seri .footer-funding-tooltip') as HTMLElement | null;

    expect(seriFlag).toBeTruthy();
    expect(seriText?.textContent).toContain('State Secretariat for Education, Research and Innovation');
    expect(seriTooltip?.textContent).toContain('SERI contract No. 23.00638');
  });

  it('should use the updated CHUV mark in the partner row', () => {
    const chuvLogo = fixture.nativeElement.querySelector('.chuv-logo') as HTMLImageElement | null;

    expect(chuvLogo?.getAttribute('src')).toBe('assets/footer/CHUV_Logo_Simple_BLANC.png');
    expect(chuvLogo?.getAttribute('alt')).toBe('CHUV logo');
  });
});
