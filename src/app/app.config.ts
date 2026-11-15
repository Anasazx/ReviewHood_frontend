import {
  ApplicationConfig,
  LOCALE_ID,
  provideZoneChangeDetection,
  importProvidersFrom
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { serverTimeoutInterceptor } from './core/interceptors/server-timeout.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import {
  GoogleLoginProvider,
  SocialAuthServiceConfig,
  SocialLoginModule
} from '@abacritt/angularx-social-login';

import { GOOGLE_CLIENT_ID } from './config/google.config';

// The site is in French: dates and numbers too ("15 nov. 2026", "4,5")
registerLocaleData(localeFr);


export const appConfig: ApplicationConfig = {

  providers: [

    importProvidersFrom(
      SocialLoginModule
    ),

    provideAnimations(),

    { provide: LOCALE_ID, useValue: 'fr' },

    provideZoneChangeDetection({
      eventCoalescing:true
    }),

    provideRouter(routes),

    provideClientHydration(withEventReplay()),

    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        serverTimeoutInterceptor
      ])
    ),


    {
      provide: 'SocialAuthServiceConfig',

      useValue: {

        autoLogin:false,

        lang:'fr',

        providers:[
          {
            id: GoogleLoginProvider.PROVIDER_ID,

            provider:new GoogleLoginProvider(
              GOOGLE_CLIENT_ID,
              {
                oneTapEnabled:false
              }
            )
          }
        ]

      } as SocialAuthServiceConfig

    }

  ]

};
