import {Country} from '../../../../core/models/enums/country.enum.model';
import {SocialLink} from '../socialLink.model';
import {Industry} from '../../enums/industry.enum.model';
import {CompanyStatus} from '../../enums/companyStatus.enum.model';
import {SubcategoryResponse} from '../../../../core/models/dto/subcategoryDTO/subcategoryResponse.model';

export interface CompanyDetailResponse {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string;
  bannerUrl?: string;
  phoneNumber: string;
  address: string;
  country: Country;
  industry: Industry;
  subcategories: SubcategoryResponse[];
  socialLinks: SocialLink[];
  status: CompanyStatus;
  // checked by ReviewHood, shows the verified badge
  verified?: boolean;
  averageRating?: number;
  reviewCount?: number;
  productCount?: number;
}


