import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {AuthService} from './features/auth/services/authService/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private authService: AuthService,
    private router: Router
  ) {

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (this.isBrowser) window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

  }

  ngOnInit(): void {
    this.authService.initAuth();
  }

  title = 'ReviewHood';

}
