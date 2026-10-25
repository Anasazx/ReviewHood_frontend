import {UserStatus} from '../../enums/userStatus.enum.model';
import {Country} from '../../../../core/models/enums/country.enum.model';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  phoneNumber: string;
  country: Country;
  status: UserStatus;
  createdAt: string;
  // false for Google accounts that never set a password
  hasPassword?: boolean;
}
