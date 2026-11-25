import { Schema, model } from 'mongoose';

const imageSchema = new Schema({ url: String, public_id: String }, { _id: false });
const rangeSchema = new Schema({ open: String, close: String }, { _id: false }); // "08:30"
const daySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6 }, // 0 = domingo
    closed: { type: Boolean, default: false },
    ranges: { type: [rangeSchema], default: [] }, // hasta 2 franjas
  },
  { _id: false }
);

const DEFAULT_SCHEDULE = [0, 1, 2, 3, 4, 5, 6].map((day) =>
  day === 0
    ? { day, closed: true, ranges: [] }
    : {
        day,
        closed: false,
        ranges: [
          { open: '08:30', close: '13:00' },
          { open: '17:00', close: '21:00' },
        ],
      }
);

const DEFAULT_POST_PURCHASE =
  'Enviá el comprobante de transferencia por WhatsApp y coordinamos el envío por Uber Moto.';

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true }, // documento único
    businessName: { type: String, default: 'El Emporio de la Golosina' },
    logoTopbar: { type: imageSchema, default: null }, // Logo 1 (circular)
    logoMain: { type: imageSchema, default: null }, // Logo 2 (horizontal)
    homeImage: { type: imageSchema, default: null }, // Foto del inicio (fondo de la tarjeta principal del home)
    topbarText: { type: String, default: 'Tienda mayorista de Golosinas & Más' },
    address: { type: String, default: 'Av. Aconquija 2030, Yerba Buena, Tucumán' },
    mapsUrl: {
      type: String,
      default:
        'https://www.google.com/maps/search/?api=1&query=Av.+Aconquija+2030,+Yerba+Buena,+Tucumán',
    },
    schedule: { type: [daySchema], default: DEFAULT_SCHEDULE },
    scheduleText: { type: String, default: 'Lunes a Sábado de 8:30 a 13 h y de 17 a 21 h' },
    instagram: { type: String, default: 'https://www.instagram.com/elemporiodelagolosina.yb/' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    whatsapp: { type: String, default: '5493813495928' },
    bank: {
      alias: { type: String, default: '' },
      cbu: { type: String, default: '' },
      holder: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    lowStockThreshold: { type: Number, default: 5 },
    minOrderAmount: { type: Number, default: 0 },
    postPurchaseMessage: { type: String, default: DEFAULT_POST_PURCHASE },
    promoPopupEnabled: { type: Boolean, default: true }, // cartel de promos al entrar a la tienda
  },
  { timestamps: true }
);

export default model('Settings', settingsSchema);
export { DEFAULT_SCHEDULE };
