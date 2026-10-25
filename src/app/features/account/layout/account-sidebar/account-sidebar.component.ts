import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import {Component, EventEmitter, Output} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {SharedService} from '../../../../core/services/sharedService/shared.service';
import {AuthService} from '../../../auth/services/authService/auth.service';
import {CommonModule} from '@angular/common';
import {ImageUrlPipe} from '../../../../core/pipes/image-url.pipe';

@Component({
  selector: 'app-account-sidebar',
  imports: [AvatarComponent, 
    RouterLink,
    CommonModule,
    RouterLinkActive
  ],
  templateUrl: './account-sidebar.component.html',
  styleUrl: './account-sidebar.component.css'
})
export class AccountSidebarComponent {

  @Output() closeSidebar = new EventEmitter<void>();

  close() {
    this.closeSidebar.emit();
  }

  constructor(
    public sharedService: SharedService,
    public authService: AuthService
  ) {}

}
