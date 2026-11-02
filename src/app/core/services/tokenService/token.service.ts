import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})

export class TokenService {

  private readonly tokenKey = 'auth_token';

  // No localStorage on the server: pages render as a logged-out visitor
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.tokenKey) : null;
  }

  setToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.tokenKey, token);
  }

  clear(): void {
    if (this.isBrowser) localStorage.removeItem(this.tokenKey);
  }

}
