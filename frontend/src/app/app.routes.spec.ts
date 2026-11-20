import { AuthCallbackComponent } from './callback/authcallback.component';
import { AccountComponent } from './account/account.component';
import { OverviewComponent } from './overview/overview.component';
import { AuthGuard } from './guards/auth.guard';
import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  const find = (path: string) => appRoutes.find((route) => route.path === path);

  it('registers the OAuth callback route', () => {
    expect(find('auth-callback')?.component).toBe(AuthCallbackComponent);
  });

  it('serves the overview at the root', () => {
    expect(find('')?.component).toBe(OverviewComponent);
  });

  it('lazy-loads the pathology explorer', async () => {
    const route = find('pathology');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route!.loadComponent as () => Promise<unknown>)();
    expect((component as { name: string }).name).toBe('PathologyComponent');
  });

  it('guards the account page', () => {
    const route = find('account');
    expect(route?.component).toBe(AccountComponent);
    expect(route?.canActivate).toEqual([AuthGuard]);
  });

  it('sends unknown paths home', () => {
    expect(find('**')?.redirectTo).toBe('');
  });
});
