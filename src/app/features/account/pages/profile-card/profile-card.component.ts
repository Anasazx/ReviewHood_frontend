import { AvatarComponent } from '../../../../core/sharedComponents/avatar/avatar.component';
import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../../../core/services/sharedService/shared.service';
import { UserService } from '../../../user/services/userService/user.service';
import { UserResponse } from '../../../user/models/userDTO/userResponse.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Country } from '../../../../core/models/enums/country.enum.model';
import {UpdateUserRequest} from '../../../user/models/userDTO/updateUserRequest.model';
import {ImageUrlPipe} from '../../../../core/pipes/image-url.pipe';
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (res) => {
        this.user = res;
      }
    });
  }

  editingMode = false;

  editingField: 'phone' | 'country'| 'email' | null = null;

  editModel: {
    phoneNumber: string;
    email: string;
    country: Country | null;
  } = {
    phoneNumber: '',
    email: '',
    country: null
  };

  enableEditMode() {
    this.editingMode = true;
  }

  cancelEdit() {
    this.editingMode = false;
    this.editingField = null;
  }

  startEdit(field: 'phone' | 'email' | 'country') {
    this.editingField = field;
    if (!this.user) return;
    this.editModel.phoneNumber = this.user.phoneNumber || '';
    this.editModel.email = this.user.email || '';
    this.editModel.country = this.user.country ?? null;
  }

  save() {
    if (!this.user) return;

    const payload: UpdateUserRequest = {
      phoneNumber: this.editModel.phoneNumber?.trim() || '',
      email: this.editModel.email?.trim() || '',
      country: this.editModel.country ?? this.user.country
    };

    this.userService.updateMyProfile(payload).subscribe({
      next: (res) => {
        this.user = res;
        this.editingMode = false;
        this.editingField = null;
      }
    });
  }

  onAvatarSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.user) return;
    this.userService.uploadAvatar(file).subscribe({
      next: (updatedUser: UserResponse) => {
        this.user = updatedUser; // instant UI update
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
      }
    });
  }

  verifyEmail() {
    this.router.navigate(['/auth/verify'], {queryParams: {send: true}});
  }

}
