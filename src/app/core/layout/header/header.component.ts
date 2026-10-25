import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../features/auth/services/authService/auth.service';
import { SharedService } from '../../services/sharedService/shared.service';
import { filter } from 'rxjs';
import { MobileSidebarComponent } from '../mobile-sidebar/mobile-sidebar.component';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';
import { AuthRequiredComponent } from '../../sharedComponents/auth-required/auth-required.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { ConfirmModalComponent } from '../../sharedComponents/confirm-modal/confirm-modal.component';
import { SuggestProductModalComponent } from '../../sharedComponents/suggest-product-modal/suggest-product-modal.component';
import {ToastService} from '../../services/toastService/toast.service';
import {SearchBarComponent} from '../search-bar/search-bar.component';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MobileSidebarComponent, ImageUrlPipe, AuthRequiredComponent, ConfirmModalComponent, SuggestProductModalComponent, SearchBarComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateX(100%)'
        }),
        animate(
          '300ms ease-out',
          style({
            opacity: 1,
            transform: 'translateX(0)'
          })
        )
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({
            opacity: 0,
            transform: 'translateX(100%)'
          })
        )
      ])
    ])
  ]
})

export class HeaderComponent implements OnInit {

  @Output() searchChange = new EventEmitter<string>();

  userMenuOpen = false;
  logoutConfirmOpen = false;
  showAuthModal= false;
  mobileMenuOpen = false;
  suggestProductOpen = false;

  get isHome(): boolean {
    return this.router.url.split(/[?#]/)[0] === '/';
  }

  constructor(
    public authService: AuthService,
    private router: Router,
    public sharedService: SharedService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.pipe(filter(user => !!user)).subscribe(() => {});
  }


  goToSearch(value: string) {
    if (!value.trim()) return;
    this.router.navigate(['/search'], { queryParams: { q: value } });
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }


  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  confirmLogout(): void {
    this.logoutConfirmOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }

  mobileSearchOpen = false;

  openLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  onSuggestionSubmitted() {
    this.toastService.show("Suggestion sent!");
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.userMenuOpen = false;
    }
  }

}
