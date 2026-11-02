import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'p/:id', renderMode: RenderMode.Server },
  { path: 'c/:id', renderMode: RenderMode.Server },
  { path: 'search', renderMode: RenderMode.Server },

  // Logged-in pages depend on the token in localStorage, so the server has nothing useful to render
  { path: 'account/**', renderMode: RenderMode.Client },
  { path: 'auth/**', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Server }
];
