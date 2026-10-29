import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  localDev = false;

  publicUrl!: string;
  imageUrl!: string;

  constructor() {
    if (this.localDev) {
      this.publicUrl = "http://localhost:8080";
      this.imageUrl = "http://localhost:9000/uploads";
    }
    else {
      this.publicUrl = "https://api.reviewhood.tech";
      this.imageUrl = "https://api.reviewhood.tech/uploads";
    }
  }

  getImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) {
      return 'https://placehold.co/600x400/EEE/31343C';
    }
    return `${this.imageUrl}/${imageUrl}`;
  }

}
