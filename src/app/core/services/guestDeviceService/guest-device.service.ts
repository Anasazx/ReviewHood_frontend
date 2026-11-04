import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// A random id that lets a logged-out browser find, edit and delete the reviews it wrote
@Injectable({
  providedIn: 'root'
})
export class GuestDeviceService {

  private readonly deviceIdKey = 'guest_device_id';

  // No localStorage on the server: pages render without a guest
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  getDeviceId(): string | null {
    return this.isBrowser ? localStorage.getItem(this.deviceIdKey) : null;
  }

  getOrCreateDeviceId(): string | null {
    if (!this.isBrowser) return null;

    let deviceId = this.getDeviceId();
    if (!deviceId) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      deviceId = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(this.deviceIdKey, deviceId);
    }
    return deviceId;
  }

}
