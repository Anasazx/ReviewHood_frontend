import { Component, computed, input, signal } from '@angular/core';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';

// Profile picture, or the person's initials when they have none (or the image fails to load).
// Size it from the host: <app-avatar class="h-9 w-9 text-[2.25rem]" ...>, the font size scales the initials.
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [ImageUrlPipe],
  template: `
    @if (url() && !failed()) {
      <img [src]="url() | imageUrl" [alt]="name() || 'Profile'" (error)="failed.set(true)"
           class="h-full w-full rounded-full border border-slate-200 object-cover" />
    } @else {
      <span class="flex h-full w-full items-center justify-center rounded-full font-semibold"
            [class]="company() ? 'bg-ink text-white' : 'bg-brand-100 text-brand-700'"
            [style.font-size.em]="0.4" aria-hidden="true">{{ initials() }}</span>
    }
  `,
  host: { class: 'inline-block shrink-0 overflow-hidden rounded-full' },
})
export class AvatarComponent {
  url = input<string | null | undefined>();
  name = input<string | null | undefined>();
  // company actors get the dark brand color so they stand out in threads
  company = input(false);

  readonly failed = signal(false);
  readonly initials = computed(() => {
    const parts = (this.name() ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });
}
