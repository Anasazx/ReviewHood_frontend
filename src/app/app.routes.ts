import { Routes } from '@angular/router';
import { MainComponent } from './core/layout/main/main.component';
import { guestGuard } from './core/guards/guestGuard/guest.guard';
import { emailVerificationGuard } from './core/guards/emailVerificationGuard/email-verification.guard';
import { authGuard } from './core/guards/authGuard/auth.guard';
import { HomeComponent } from './features/home/pages/home/home.component';

const title = (page: string) => `${page} · ReviewHood`;

// The home page loads with the app; every other page is lazy loaded so the first visit is fast
export const routes: Routes = [
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/layout/account-layout/account-layout.component').then(m => m.AccountLayoutComponent),
    children: [
      { path: 'profile', title: title('Profile'), loadComponent: () => import('./features/account/pages/profile-card/profile-card.component').then(m => m.ProfileCardComponent) },
      { path: 'security', title: title('Security'), loadComponent: () => import('./features/account/pages/security/security.component').then(m => m.SecurityComponent) },
      { path: 'reviews', title: title('My reviews'), loadComponent: () => import('./features/account/pages/my-reviews/my-reviews.component').then(m => m.MyReviewsComponent) },
      { path: 'comments', title: title('My comments'), loadComponent: () => import('./features/account/pages/my-comments/my-comments.component').then(m => m.MyCommentsComponent) },
      { path: 'suggestions', title: title('My suggestions'), loadComponent: () => import('./features/account/pages/my-suggestions/my-suggestions.component').then(m => m.MySuggestionsComponent) },
      { path: '', redirectTo: 'profile', pathMatch: 'full' }
    ]
  },

  {
    path: '',
    component: MainComponent,
    children: [
      { path: '', title: 'ReviewHood · Honest reviews from real customers', component: HomeComponent },
      { path: 'p/:id', title: title('Product'), loadComponent: () => import('./features/product/pages/product-details/product-details.component').then(m => m.ProductDetailsComponent) },
      { path: 'c/:id', title: title('Company'), loadComponent: () => import('./features/company/pages/company-details/company-details.component').then(m => m.CompanyDetailsComponent) },
      { path: 'search', title: title('Search'), loadComponent: () => import('./features/search/pages/search/search.component').then(m => m.SearchComponent) },
      { path: 'categories', title: title('Categories'), loadComponent: () => import('./features/category/pages/categories/categories.component').then(m => m.CategoriesComponent) },
      { path: 'products', title: title('Products'), loadComponent: () => import('./features/product/pages/all-products/all-products.component').then(m => m.AllProductsComponent) },
      { path: 'companies', title: title('Companies'), loadComponent: () => import('./features/company/pages/all-companies/all-companies.component').then(m => m.AllCompaniesComponent) },
      { path: 'auth/login', title: title('Log in'), canActivate: [guestGuard], loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent) },
      { path: 'auth/register', title: title('Sign up'), canActivate: [guestGuard], loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent) },
      { path: 'auth/verify', title: title('Verify your email'), canActivate: [emailVerificationGuard], loadComponent: () => import('./features/auth/pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
      { path: 'not-found', title: title('Page not found'), loadComponent: () => import('./core/sharedComponents/not-found/not-found.component').then(m => m.NotFoundComponent) },
      { path: 'about', title: title('About'), loadComponent: () => import('./features/about/about/about.component').then(m => m.AboutComponent) }
    ]
  },

  {
    path: '**',
    redirectTo: 'not-found'
  }

];
