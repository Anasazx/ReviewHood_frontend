import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import {
  GoogleLoginProvider,
  SocialAuthServiceConfig,
  SocialLoginModule
} from '@abacritt/angularx-social-login';

import { GOOGLE_CLIENT_ID } from './config/google.config';


export const appConfig: ApplicationConfig = {

  providers: [

    importProvidersFrom(
      SocialLoginModule
    ),

    provideAnimations(),

    provideZoneChangeDetection({
      eventCoalescing:true
    }),

    provideRouter(routes),

    provideClientHydration(withEventReplay()),

    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor
      ])
    ),


    {
      provide: 'SocialAuthServiceConfig',

      useValue: {

        autoLogin:false,

        lang:'en',

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
