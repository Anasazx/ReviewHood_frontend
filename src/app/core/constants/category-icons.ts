// Font Awesome icon for a category or subcategory, picked from keywords in its name
const ICONS: [RegExp, string][] = [
  [/makeup|maquillage|lip|mascara/i, 'fa-wand-magic-sparkles'],
  [/hair|cheveu|capill/i, 'fa-scissors'],
  [/perfum|parfum|fragrance/i, 'fa-spray-can-sparkles'],
  [/skin|soin|visage|face|serum|cream|crème/i, 'fa-droplet'],
  [/nail|ongle/i, 'fa-hand-sparkles'],
  [/body|corps|shower|douche|savon|soap|deodor|déodor/i, 'fa-pump-soap'],
  [/\bmen\b|homme|beard|barbe/i, 'fa-user-tie'],
  [/beauty|beauté|cosmet/i, 'fa-spa'],
  [/oil|huile/i, 'fa-oil-can'],
  [/tool|accessor|outil/i, 'fa-toolbox'],
  [/gaming|game|console|jeu/i, 'fa-gamepad'],
  [/phone|mobile|téléphone/i, 'fa-mobile-screen'],
  [/tech|electro|computer|laptop|informatique/i, 'fa-laptop'],
  [/food|aliment|snack|epicer|épicer|drink|boisson/i, 'fa-utensils'],
  [/fashion|cloth|vêtement|mode|shoe|chaussure/i, 'fa-shirt'],
  [/home|maison|furniture|meuble|kitchen|cuisine/i, 'fa-couch'],
  [/health|santé|pharma|vitamin/i, 'fa-heart-pulse'],
  [/baby|bébé|enfant|kid|child/i, 'fa-baby'],
  [/sport|fitness|gym/i, 'fa-dumbbell'],
  [/car|auto|moto/i, 'fa-car'],
  [/book|livre/i, 'fa-book'],
];

export function categoryIcon(name: string | null | undefined): string {
  if (!name) return 'fa-tag';
  return ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? 'fa-tag';
}
