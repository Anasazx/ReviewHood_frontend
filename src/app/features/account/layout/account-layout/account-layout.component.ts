import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AccountSidebarComponent } from '../account-sidebar/account-sidebar.component';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { ToastComponent } from '../../../../core/sharedComponents/toast/toast.component';
import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import { AuthService } from '../../../auth/services/authService/auth.service';

@Component({
  selector: 'app-account-layout',
  imports: [
    RouterOutlet,
    CommonModule,
    AccountSidebarComponent,
    HeaderComponent,
    ToastComponent,
    AvatarComponent
  ],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.css'
})
export class AccountLayoutComponent {
  constructor(public authService: AuthService) {}
}
