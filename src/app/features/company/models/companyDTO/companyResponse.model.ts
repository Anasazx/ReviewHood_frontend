import {Country} from '../../../../core/models/enums/country.enum.model';
import {CompanyStatus} from '../../enums/companyStatus.enum.model';

export interface CompanyResponse {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string;
  bannerUrl?: string;
  country: Country;
  status: CompanyStatus;
  // checked by ReviewHood, shows the verified badge
  verified?: boolean;

}
