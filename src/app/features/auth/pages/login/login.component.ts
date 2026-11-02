import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/authService/auth.service';

import {
  SocialAuthService,
  GoogleSigninButtonDirective
} from '@abacritt/angularx-social-login';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    GoogleSigninButtonDirective
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  loading = false;
  error: string | null = null;
  showPassword = false;
  passwordValue = '';
  confirmPasswordValue = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private socialAuthService: SocialAuthService,
  ) {
  }

  ngOnInit(): void {

    this.socialAuthService.authState.subscribe(user => {

      if (!user) {
        return;
      }

      this.loading = true;
      this.error = null;

      this.authService.googleLogin().subscribe({

        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },

        error: (err) => {
          this.loading = false;

          console.error('Google login failed:', err);

          this.error =
            err?.error?.message ||
            err?.message ||
            'Google login failed';
        }

      });

    });

  }





  onSubmit(email: string, password: string, event: Event): void {

    event.preventDefault();

    this.error = null;

    if (!email || !password) {
      this.error = 'Email and password are required.';
      return;
    }

    this.loading = true;

    this.authService.login({
      email,
      password
    }).subscribe({

      next: () => {

        this.loading = false;
        this.router.navigate(['/']);

      },

      error: (err) => {

        this.loading = false;

        this.error =
          err?.error?.message ||
          err?.message ||
          'Login failed';

      }

    });

  }

}
