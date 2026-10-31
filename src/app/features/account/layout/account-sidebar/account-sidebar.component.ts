import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/services/authService/auth.service';
import { ConfirmModalComponent } from '../../../../core/sharedComponents/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-account-sidebar',
  imports: [NgClass, RouterLink, RouterLinkActive, ConfirmModalComponent],
  templateUrl: './account-sidebar.component.html',
  styleUrl: './account-sidebar.component.css'
})
export class AccountSidebarComponent {

  readonly items = [
    { path: '/account/profile', label: 'Profile', icon: 'fa-user' },
    { path: '/account/reviews', label: 'Reviews', icon: 'fa-star' },
    { path: '/account/comments', label: 'Comments', icon: 'fa-comment' },
    { path: '/account/suggestions', label: 'Suggestions', icon: 'fa-lightbulb' },
    { path: '/account/security', label: 'Security', icon: 'fa-shield-halved' },
  ];

  logoutConfirmOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  logout() {
    this.logoutConfirmOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
