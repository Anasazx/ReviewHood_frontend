import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyResponse } from '../../models/companyDTO/companyResponse.model';
import { CompanyService } from '../../services/companyService/company.service';
import { CompanyStatus } from '../../enums/companyStatus.enum.model';
import { ImageUrlPipe } from '../../../../core/pipes/image-url.pipe';

@Component({
  selector: 'app-all-companies',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageUrlPipe],
  templateUrl: './all-companies.component.html',
  styleUrl: './all-companies.component.css'
})
export class AllCompaniesComponent implements OnInit {

  constructor(private companyService: CompanyService) {}

  companies: CompanyResponse[] = [];
  filteredCompanies: CompanyResponse[] = [];

  loading = true;
  loadingMore = false;

  searchTerm = '';
  verifiedOnly = false;

  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  isLastPage = false;

  protected readonly CompanyStatus = CompanyStatus;

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies() {
    this.companyService.getCompanies(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.companies.push(...response.content);
        this.totalElements = response.totalElements;
        this.isLastPage = response.last;
        this.loading = false;
        this.loadingMore = false;
        this.applyFilters();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.loadingMore = false;
      }
    });
  }

  loadMore() {
    if (this.isLastPage || this.loadingMore) return;
    this.loadingMore = true;
    this.currentPage++;
    this.loadCompanies();
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCompanies = this.companies.filter(c => {
      const matchesTerm = !term || c.name.toLowerCase().includes(term);
      const matchesVerified = !this.verifiedOnly || c.verified;
      return matchesTerm && matchesVerified;
    });
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.applyFilters();
  }

  toggleVerifiedOnly() {
    this.verifiedOnly = !this.verifiedOnly;
    this.applyFilters();
  }

}
