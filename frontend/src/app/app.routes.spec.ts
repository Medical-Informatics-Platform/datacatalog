import { AuthCallbackComponent } from './callback/authcallback.component';
import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  it('registers the OAuth callback route', () => {
    const callbackRoute = appRoutes.find((route) => route.path === 'auth-callback');

    expect(callbackRoute?.component).toBe(AuthCallbackComponent);
  });
});
