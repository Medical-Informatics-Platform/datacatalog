import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { HomeSectionRedirectComponent } from './pages/home-section-redirect/home-section-redirect.component';
import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  it('uses the root path for the landing page', () => {
    const homeRoute = appRoutes.find((route) => route.path === '');

    expect(homeRoute?.component).toBe(LandingPageComponent);
  });

  it('keeps /home as a legacy alias that redirects back to the landing page', () => {
    const legacyHomeRoute = appRoutes.find((route) => route.path === 'home');

    expect(legacyHomeRoute?.component).toBe(HomeSectionRedirectComponent);
  });

  it('exposes add and update federation form routes under /federations', () => {
    const federationsRoute = appRoutes.find((route) => route.path === 'federations');
    const childPaths = (federationsRoute?.children ?? []).map((route) => route.path);

    expect(childPaths).toEqual(['', 'add', 'update']);
    expect(federationsRoute?.children?.[0]?.component).toBe(HomeSectionRedirectComponent);
    expect(federationsRoute?.children?.[1]?.data).toEqual({ isUpdate: false });
    expect(federationsRoute?.children?.[2]?.data).toEqual({ isUpdate: true });
  });
});
