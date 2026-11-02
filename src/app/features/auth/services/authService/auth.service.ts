import { Injectable } from '@angular/core';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, Observable, switchMap, tap} from 'rxjs';
import { AuthResponse } from '../../models/authDTO/authResponse.model';
import { LoginRequest } from '../../models/authDTO/loginRequest.model';
import { RegisterRequest } from '../../models/authDTO/registerRequest.model';
import {MinimizedUserResponse} from '../../../user/models/userDTO/minimizedUserResponse.model';
import {TokenService} from '../../../../core/services/tokenService/token.service';
import {SocialAuthService} from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})

export class AuthService {

  private readonly authUrl: string;

  private currentUserSubject = new BehaviorSubject<MinimizedUserResponse | null>(null);

  currentUser$ = this.currentUserSubject.asObservable();

  private authReadySubject = new BehaviorSubject<boolean>(false);

  authReady$ = this.authReadySubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private sharedService: SharedService,
    private socialAuthService: SocialAuthService
  ) {
    this.authUrl = this.sharedService.publicUrl + '/auth';
  }

  initAuth(): void {
    const token = this.tokenService.getToken();

    if (!token) {
      this.authReadySubject.next(true);
      return;
    }

    this.loadCurrentUser().subscribe({

      next: () => {
        this.authReadySubject.next(true);
      },

      error: (err) => {
        console.error("LOAD USER FAILED", err);
        this.logout();
        this.authReadySubject.next(true);
      }

    });
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, request).pipe(
      tap(res => {
        this.tokenService.setToken(res.token);
        this.currentUserSubject.next(res.user);
      })
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, request).pipe(
      tap(res => {
        this.tokenService.setToken(res.token);
        this.currentUserSubject.next(res.user);
      })
    );
  }

  googleLogin(): Observable<AuthResponse> {
    return this.socialAuthService.authState.pipe(switchMap(user => {
        return this.http.post<AuthResponse>(`${this.authUrl}/google`, {idToken: user.idToken}).pipe(
          tap(res => {
            this.tokenService.setToken(res.token);
            this.currentUserSubject.next(res.user);
          })
        );
      })
    );
  }

  loadCurrentUser(): Observable<MinimizedUserResponse> {
    return this.http.get<MinimizedUserResponse>(`${this.authUrl}/me`).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUserSubject.next(null);
    this.socialAuthService.signOut();
  }

  isCompanyMember(): boolean{
    return false
  }

  get getCurrentUser(): MinimizedUserResponse | null {
    return this.currentUserSubject.value;
  }

}
