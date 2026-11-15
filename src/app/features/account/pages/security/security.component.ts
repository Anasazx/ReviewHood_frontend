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
      this.error = 'Vérifiez les champs ci-dessus.';
      return;
    }
    this.saving = true;
    this.userService.changePassword(this.hasPassword ? this.currentPassword : null, this.newPassword).subscribe({
      next: () => {
        this.saving = false;
        this.toast.show(this.hasPassword ? 'Mot de passe modifié.' : 'Mot de passe défini. Vous pouvez aussi vous connecter avec votre e-mail.', 'success');
        this.hasPassword = true;
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // The API's messages are in English, so the user sees ours
        this.error = err.status === 400 && /current password/i.test(err.error?.detail ?? '')
          ? 'Votre mot de passe actuel est incorrect.'
          : err.status === 400
            ? 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
            : 'Impossible de modifier votre mot de passe. Veuillez réessayer.';
      }
    });
  }
}
