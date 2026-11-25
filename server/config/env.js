import 'dotenv/config';

const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET_ADMIN: process.env.JWT_SECRET_ADMIN,
  JWT_SECRET_CUSTOMER: process.env.JWT_SECRET_CUSTOMER,
  // Dirección pública de la tienda (sitemap y SEO)
  SITE_URL: (process.env.SITE_URL || 'https://www.elemporiodelagolosina.com').replace(/\/$/, ''),
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

// MONGO_URI vacío en desarrollo = base local automática (ver config/db.js)
[...(env.NODE_ENV === 'production' ? ['MONGO_URI'] : []), 'JWT_SECRET_ADMIN', 'JWT_SECRET_CUSTOMER'].forEach((key) => {
  if (!env[key]) console.warn(`⚠️  Falta la variable de entorno ${key}`);
});

export default env;
