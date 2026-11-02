import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),

    // The Google provider loads its script into the page and calls window.google, so it only runs in the browser
    {
      provide: 'SocialAuthServiceConfig',
      useValue: { autoLogin: false, providers: [] } as SocialAuthServiceConfig
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
