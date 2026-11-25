/**
 * Normalización de textos (mismo criterio que client/src/utils/text.js)
 * - minúsculas, sin tildes, sin espacios dobles, trim
 */
function normalizeText(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clave para comparar nombres (proveedores/categorías): como normalizeText
 * pero además sin apóstrofes ni signos → "L'Heritier" = "lheritier", "Que Rico!" = "que rico"
 */
function matchKey(str) {
  return normalizeText(str)
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Chicles y Caramelos" → "chicles-y-caramelos" */
function slugify(str) {
  return normalizeText(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Escapa caracteres especiales para usar un texto dentro de un RegExp */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "CHICLES Y CARAMELOS" → "Chicles Y Caramelos" (los conectores quedan en minúscula) */
function toTitleCase(str) {
  const minor = ['y', 'de', 'del', 'la', 'el', 'con', 'en', 'e', 'o'];
  return String(str ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i > 0 && minor.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Genera un slug único dado un set de slugs existentes */
function uniqueSlug(base, takenSet) {
  const root = slugify(base) || 'item';
  let slug = root;
  let i = 2;
  while (takenSet.has(slug)) slug = `${root}-${i++}`;
  takenSet.add(slug);
  return slug;
}

export { normalizeText, matchKey, slugify, escapeRegex, toTitleCase, uniqueSlug };
