import Settings from '../models/Settings.js';

/** Devuelve el documento único de Settings (lo crea con valores por defecto si no existe) */
async function getSettings() {
  let settings = await Settings.findOne({ key: 'main' });
  if (!settings) settings = await Settings.create({ key: 'main' });
  return settings;
}

/** Subconjunto público (sin email de notificación ni datos internos) */
function toPublic(s) {
  return {
    businessName: s.businessName,
    logoTopbar: s.logoTopbar?.url ? s.logoTopbar : null,
    logoMain: s.logoMain?.url ? s.logoMain : null,
    homeImage: s.homeImage?.url ? s.homeImage : null,
    topbarText: s.topbarText,
    address: s.address,
    mapsUrl: s.mapsUrl,
    schedule: s.schedule,
    scheduleText: s.scheduleText,
    instagram: s.instagram,
    facebook: s.facebook,
    tiktok: s.tiktok,
    whatsapp: s.whatsapp,
    bank: s.bank,
    lowStockThreshold: s.lowStockThreshold,
    minOrderAmount: s.minOrderAmount,
    postPurchaseMessage: s.postPurchaseMessage,
    promoPopupEnabled: s.promoPopupEnabled !== false,
  };
}

export { getSettings, toPublic };
