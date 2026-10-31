import { Component } from '@angular/core';
import { SuggestProductService } from '../../../../core/services/suggestProductService/suggest-product.service';
import { ProductSuggestionResponse } from '../../../../core/models/dto/ProductSuggestionDTO/ProductSuggestionResponse.model';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-my-suggestions',
  imports: [
    DatePipe,
    NgClass,
    CommonModule,
    RouterLink
  ],
  templateUrl: './my-suggestions.component.html',
  styleUrl: './my-suggestions.component.css'
})
export class MySuggestionsComponent {

  suggestions: ProductSuggestionResponse[] = [];

  loading = true;

  constructor(
    private suggestProductService: SuggestProductService
  ) {}

  ngOnInit(): void {
    this.loadSuggestions();
  }

  // Human wording for the backend status codes
  status(code: string): { label: string; icon: string; classes: string } {
    switch (code) {
      case 'APPROVED': return { label: 'Added', icon: 'fa-circle-check', classes: 'bg-brand-50 text-brand-700' };
      case 'REJECTED': return { label: 'Not added', icon: 'fa-circle-xmark', classes: 'bg-red-50 text-red-600' };
      default: return { label: 'In review', icon: 'fa-clock', classes: 'bg-amber-50 text-amber-700' };
    }
  }

  loadSuggestions(): void {
    this.loading = true;
    this.suggestProductService.getMySuggestions().subscribe({
      next: (data) => {
        this.suggestions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

}
