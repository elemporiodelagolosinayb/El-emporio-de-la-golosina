import Product from '../models/Product.js';
import Category from '../models/Category.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);

/**
 * GET /api/sitemap.xml — lista de páginas públicas para Google (inicio, catálogo, categorías y productos).
 * La tienda la publica en https://<dominio>/sitemap.xml (rewrite en client/vercel.json).
 */
export const sitemap = asyncHandler(async (req, res) => {
  const base = env.SITE_URL;
  const [categories, products] = await Promise.all([
    Category.find({ active: true }, 'slug updatedAt').sort({ order: 1 }).lean(),
    Product.find({ active: true }, 'slug updatedAt').sort({ name: 1 }).lean(),
  ]);

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/catalogo', priority: '0.9', changefreq: 'daily' },
    { loc: '/promociones', priority: '0.8', changefreq: 'daily' },
    ...categories.map((c) => ({ loc: `/catalogo/${c.slug}`, lastmod: c.updatedAt, priority: '0.8', changefreq: 'weekly' })),
    ...products.map((p) => ({ loc: `/producto/${p.slug}`, lastmod: p.updatedAt, priority: '0.6', changefreq: 'weekly' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escapeXml(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${day(u.lastmod)}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;

  res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
  res.send(xml);
});
