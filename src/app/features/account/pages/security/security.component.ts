import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../../user/services/userService/user.service';
import { ToastService } from '../../../../core/services/toastService/toast.service';

// Change (or, for Google accounts, set) the account password
@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security.component.html',
})
export class SecurityComponent implements OnInit {
  private userService = inject(UserService);
  private toast = inject(ToastService);

  hasPassword = true;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  show = false;
  saving = false;
  error: string | null = null;

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({ next: u => this.hasPassword = u.hasPassword !== false });
  }

  get tooShort(): boolean {
    return this.newPassword.length > 0 && this.newPassword.length < 8;
  }

  get mismatch(): boolean {
    return this.confirmPassword.length > 0 && this.confirmPassword !== this.newPassword;
  }

  save() {
    this.error = null;
    if ((this.hasPassword && !this.currentPassword) || this.newPassword.length < 8 || this.newPassword !== this.confirmPassword) {
      this.error = 'Check the fields above.';
      return;
    }
    this.saving = true;
    this.userService.changePassword(this.hasPassword ? this.currentPassword : null, this.newPassword).subscribe({
      next: () => {
        this.saving = false;
        this.toast.show(this.hasPassword ? 'Password changed.' : 'Password set. You can now also sign in with your email.', 'success');
        this.hasPassword = true;
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.error = err.error?.detail || 'Could not change your password. Please try again.';
      }
    });
  }
}
