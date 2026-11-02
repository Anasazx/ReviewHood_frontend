import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { timeout } from 'rxjs';

const SERVER_API_TIMEOUT_MS = 8000;

// A server render waits for every request it starts, so a hanging API call must not hang the page
export const serverTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return isPlatformServer(inject(PLATFORM_ID))
    ? next(req).pipe(timeout(SERVER_API_TIMEOUT_MS))
    : next(req);
};
