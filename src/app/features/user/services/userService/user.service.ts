import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import {Observable} from 'rxjs';
import {UserResponse} from '../../models/userDTO/userResponse.model';
import {UpdateUserRequest} from '../../models/userDTO/updateUserRequest.model';


@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userUrl: string;

  constructor(private shared: SharedService, private http: HttpClient) {
    this.userUrl = this.shared.publicUrl + '/users';
  }

  getMyProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.userUrl}/me`);
  }


  updateMyProfile(request:UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.userUrl}/me`, request);
  }

  // currentPassword is not needed when the account has no password yet (Google sign-up)
  changePassword(currentPassword: string | null, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.userUrl}/me/password`, { currentPassword, newPassword });
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserResponse>(
      `${this.userUrl}/me/avatar`,
      formData
    );
  }

}
