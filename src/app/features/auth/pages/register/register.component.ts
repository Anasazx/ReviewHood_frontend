import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/authService/auth.service';
import { RegisterRequest } from '../../models/authDTO/registerRequest.model';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  loading = false;
  error: string | null = null;

  showPassword = false;

  passwordValue = '';
  confirmPasswordValue = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  currentYear = new Date().getFullYear();

  onSubmit(
    username: string,
    email: string,
    password: string,
    confirm: string,
    event: Event
  ) {
    event.preventDefault();

    this.error = null;

    if (!username || !email || !password || !confirm) {
      this.error = 'Tous les champs sont obligatoires.';
      return;
    }

    if (password !== confirm) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      this.error = 'Veuillez saisir une adresse e-mail valide.';
      return;
    }

    if (password.length < 8) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    this.loading = true;

    const registerRequest: RegisterRequest = {
      name: username,
      email: email,
      password: password,
    };

    this.auth.register(registerRequest).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/verify']);
      },
      error: (err) => {
        this.loading = false;
        // The API's messages are in English, so the user sees ours
        this.error = err?.status === 409
          ? 'Un compte existe déjà avec cette adresse e-mail.'
          : 'L’inscription a échoué. Veuillez réessayer.';
      }
    });
  }
}
