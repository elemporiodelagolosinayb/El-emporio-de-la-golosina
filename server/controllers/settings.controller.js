import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { getSettings, toPublic } from '../services/settings.service.js';
import { deleteImage } from '../services/cloudinary.service.js';

/** Imágenes de la configuración: /logo/topbar, /logo/main y /logo/home (foto del inicio) */
const IMAGE_FIELDS = { topbar: 'logoTopbar', main: 'logoMain', home: 'homeImage' };

const EDITABLE = [
  'topbarText', 'address', 'mapsUrl', 'schedule', 'scheduleText', 'instagram', 'facebook', 'tiktok',
  'whatsapp', 'bank', 'lowStockThreshold', 'minOrderAmount', 'postPurchaseMessage', 'promoPopupEnabled',
];

export const publicSettings = asyncHandler(async (req, res) => {
  const s = await getSettings();
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ ok: true, settings: toPublic(s) });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ ok: true, settings: await getSettings() });
});

export const update = asyncHandler(async (req, res) => {
  const s = await getSettings();
  EDITABLE.forEach((key) => {
    if (req.body[key] === undefined) return;
    if (key === 'bank') {
      const prev = s.bank || {};
      const b = req.body.bank || {};
      s.set('bank', {
        alias: b.alias ?? prev.alias ?? '',
        cbu: b.cbu ?? prev.cbu ?? '',
        holder: b.holder ?? prev.holder ?? '',
        bankName: b.bankName ?? prev.bankName ?? '',
      });
    }
    else s[key] = req.body[key];
  });
  // Validación de franjas: cierre posterior a apertura
  (s.schedule || []).forEach((d) =>
    d.ranges.forEach((r) => {
      if (r.open >= r.close) throw ApiError.badRequest('En el horario, la hora de cierre debe ser posterior a la de apertura', [{ field: 'schedule', msg: 'Franja inválida' }]);
    })
  );
  await s.save();
  res.json({ ok: true, settings: s });
});

/** PUT /logo/:type (topbar | main) body: { url, public_id } — la imagen ya se subió a Cloudinary desde el front */
export const setLogo = asyncHandler(async (req, res) => {
  const field = IMAGE_FIELDS[req.params.type] || null;
  if (!field) throw ApiError.badRequest('Tipo de imagen inválido');
  const { url, public_id } = req.body;
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url || '') || !String(public_id || '').startsWith('emporio/')) {
    throw ApiError.badRequest('Imagen inválida');
  }
  const s = await getSettings();
  const old = s[field]?.public_id;
  s[field] = { url, public_id };
  await s.save();
  if (old && old !== public_id) await deleteImage(old);
  res.json({ ok: true, settings: s });
});

export const removeLogo = asyncHandler(async (req, res) => {
  const field = IMAGE_FIELDS[req.params.type] || null;
  if (!field) throw ApiError.badRequest('Tipo de imagen inválido');
  const s = await getSettings();
  const old = s[field]?.public_id;
  s[field] = null;
  await s.save();
  await deleteImage(old);
  res.json({ ok: true, settings: s });
});
