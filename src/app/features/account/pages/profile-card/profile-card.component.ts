import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { UserService } from '../../../user/services/userService/user.service';
import { UserResponse } from '../../../user/models/userDTO/userResponse.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Country } from '../../../../core/models/enums/country.enum.model';
import {UpdateUserRequest} from '../../../user/models/userDTO/updateUserRequest.model';
import {AuthService} from '../../../auth/services/authService/auth.service';
import {ToastService} from '../../../../core/services/toastService/toast.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-profile-card',
  imports: [AvatarComponent, CommonModule, FormsModule],
  templateUrl: './profile-card.component.html',
  styleUrl: './profile-card.component.css'
})
export class ProfileCardComponent implements OnInit {

  user: UserResponse | null = null;

  countries = Object.values(Country);

  constructor(
    private userService: UserService,
    public sharedService: SharedService,
    private router: Router,
    private toast: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (res) => {
        this.user = res;
      }
    });
  }

  editing = false;
  saving = false;
  uploadingAvatar = false;

  editModel: {
    phoneNumber: string;
    country: Country | null;
  } = {
    phoneNumber: '',
    country: null
  };

  // One edit mode for the whole card: every editable field switches to an input at once
  startEdit() {
    if (!this.user) return;
    this.editModel.phoneNumber = this.user.phoneNumber || '';
    this.editModel.country = this.user.country ?? null;
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
  }

  save() {
    if (!this.user) return;

    // Email is shown read only, so it's sent back unchanged
    const payload: UpdateUserRequest = {
      phoneNumber: this.editModel.phoneNumber?.trim() || '',
      email: this.user.email,
      country: this.editModel.country ?? this.user.country
    };

    this.saving = true;
    this.userService.updateMyProfile(payload).subscribe({
      next: (res) => {
        this.user = res;
        this.editing = false;
        this.saving = false;
        this.toast.show('Profile updated.');
      },
      error: () => {
        this.saving = false;
        this.toast.show('Could not save your changes. Please try again.', 'error');
      }
    });
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.user) return;
    this.uploadingAvatar = true;
    this.userService.uploadAvatar(file).subscribe({
      next: (updatedUser: UserResponse) => {
        this.user = updatedUser; // instant UI update
        this.uploadingAvatar = false;
        this.authService.loadCurrentUser().subscribe(); // header + greeting pick up the new photo
        this.toast.show('Photo updated.');
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
        this.uploadingAvatar = false;
        this.toast.show('Could not upload that photo. Try another image.', 'error');
      }
    });
  }

  verifyEmail() {
    this.router.navigate(['/auth/verify'], {queryParams: {send: true}});
  }

}
