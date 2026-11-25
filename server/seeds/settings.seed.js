import run, { isMain } from './_run.js';
import Settings from '../models/Settings.js';

/** Inicializa el documento único de Settings con los datos del negocio (todo editable después) */
async function seedSettings() {
  const exists = await Settings.findOne({ key: 'main' });
  if (exists) {
    console.log('  Settings ya existe, no se pisa (editalo desde el admin).');
    return;
  }
  await Settings.create({
    key: 'main',
    businessName: 'El Emporio de la Golosina',
    topbarText: 'Tienda mayorista de Golosinas & Más',
    address: 'Av. Aconquija 2030, Yerba Buena, Tucumán',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Aconquija+2030,+Yerba+Buena,+Tucumán',
    scheduleText: 'Lunes a Sábado de 8:30 a 13 h y de 17 a 21 h',
    instagram: 'https://www.instagram.com/elemporiodelagolosina.yb/',
    facebook: 'https://www.facebook.com/people/El-Emporio-de-la-Golosina-YB/100063675246746/',
    whatsapp: '5493813495928',
    bank: { alias: '', cbu: '', holder: '', bankName: '' }, // pendiente: se carga desde el admin
    lowStockThreshold: 5,
    minOrderAmount: 0,
  });
  console.log('  Settings creado con los datos del negocio.');
}

export default seedSettings;
if (isMain(import.meta.url)) run('settings', seedSettings);
