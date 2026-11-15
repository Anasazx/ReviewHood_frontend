import { Pipe, PipeTransform } from '@angular/core';

// French names for the backend's enum codes (countries, industries)
const LABELS: Record<string, string> = {
  TUNISIA: 'Tunisie',
  ALGERIA: 'Algérie',
  MOROCCO: 'Maroc',
  FRANCE: 'France',
  TECHNOLOGY: 'Technologie',
  FOOD: 'Alimentation',
  AUTOMOTIVE: 'Automobile',
  EDUCATION: 'Éducation',
  HEALTHCARE: 'Santé',
  FINANCE: 'Finance',
  RETAIL: 'Commerce',
  MANUFACTURING: 'Industrie',
  OTHER: 'Autre',
};

// "TUNISIA" -> "Tunisie"; unknown codes are humanized: "SAUDI_ARABIA" -> "Saudi arabia"
export function frLabel(value: string | null | undefined): string {
  if (!value) return '';
  if (LABELS[value]) return LABELS[value];
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Pipe({ name: 'frLabel', standalone: true, pure: true })
export class FrLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return frLabel(value);
  }
}
