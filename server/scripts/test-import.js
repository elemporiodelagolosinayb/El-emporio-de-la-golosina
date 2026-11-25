/**
 * Prueba de ida y vuelta de la planilla: exportar → volver a importar → no tiene que cambiar nada.
 * Corre sobre una base temporal en memoria (no toca Atlas ni la base de desarrollo).
 *
 * Uso: npm run test:import
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, '..', 'seeds', 'data', 'productos_emporio.csv');

const mongo = await MongoMemoryServer.create();
process.env.MONGO_URI = mongo.getUri('emporio-test-import');
process.env.NODE_ENV = 'test';

// Se importan después de definir MONGO_URI (config/env lo lee al cargarse)
const { default: mongoose } = await import('mongoose');
const { connectDB } = await import('../config/db.js');
const { default: Product } = await import('../models/Product.js');
const { default: seedProducts } = await import('../seeds/products.seed.js');
const importService = await import('../services/import.service.js');
const { exportProductsXlsx } = await import('../services/excel.service.js');

const ALL = { fields: 'price,stock,category,supplier,name', createMissing: 'true', updateReview: 'true' };
let failed = 0;
const log = (ok, msg) => {
  console.log(`${ok ? '✔' : '✖'} ${msg}`);
  if (!ok) failed++;
};
async function check(name, fn) {
  try {
    await fn();
    log(true, name);
  } catch (err) {
    log(false, `${name}\n    ${err.message}`);
  }
}
const noChanges = (plan) => {
  const s = plan.summary;
  const detail = [...plan.toUpdate.slice(0, 3).map((u) => `${u.name}: ${JSON.stringify(u.changes)}`), ...plan.errors.slice(0, 3).map((e) => `fila ${e.row}: ${e.reason}`)];
  assert.equal(s.create + s.update + s.errors, 0, `crear ${s.create} · actualizar ${s.update} · errores ${s.errors}\n    ${detail.join('\n    ')}`);
};
const toCsv = (buffer, FS) => XLSX.utils.sheet_to_csv(XLSX.read(buffer, { type: 'buffer' }).Sheets.Productos, { FS });

try {
  await connectDB();
  const quiet = console.log;
  console.log = () => {};
  const seeded = await seedProducts(CSV);
  console.log = quiet;

  await check('seed:products crea los 546 productos (136 para revisar), activos y sin precio', async () => {
    assert.equal(seeded.created, 546);
    assert.equal(seeded.errorCount, 0);
    assert.equal(await Product.countDocuments({ needsReview: true }), 136);
    assert.equal(await Product.countDocuments({ active: true }), 546);
    assert.equal(await Product.countDocuments({ price: 0 }), 546);
  });

  await check('seed:products es idempotente (la 2ª vez no crea nada)', async () => {
    console.log = () => {};
    const again = await seedProducts(CSV);
    console.log = quiet;
    assert.equal(again.created, 0);
    assert.equal(await Product.countDocuments(), 546);
  });

  // Datos variados para que la prueba tenga sentido: precios con decimales, stock, código, activo
  const sample = await Product.find().sort({ name: 1 }).limit(40);
  await Promise.all(
    sample.map((p, i) => {
      Object.assign(p, { price: 1000 + i * 12.5, stock: i * 3, active: i % 2 === 0, code: i % 4 === 0 ? `E${100 + i}` : undefined });
      if (i % 5 === 0) Object.assign(p, { needsReview: true, reviewNote: `Nota de prueba ${i}` });
      return p.save();
    })
  );

  const xlsx = await exportProductsXlsx();

  await check('la exportación es .xlsx con hoja "Productos" y las 9 columnas exactas', async () => {
    const wb = XLSX.read(xlsx, { type: 'buffer' });
    assert.deepEqual(wb.SheetNames, ['Productos', 'Referencias']);
    const header = XLSX.utils.sheet_to_json(wb.Sheets.Productos, { header: 1 })[0];
    assert.deepEqual(header, ['codigo', 'nombre', 'categoria', 'proveedor', 'precio', 'stock', 'activo', 'revisar', 'nota_revision']);
  });

  await check('la planilla tiene encabezado fijo, autofiltro, desplegables y filas amarillas', async () => {
    const cfb = XLSX.CFB.read(xlsx, { type: 'buffer' });
    const sheet = Buffer.from(XLSX.CFB.find(cfb, '/xl/worksheets/sheet1.xml').content).toString();
    const styles = Buffer.from(XLSX.CFB.find(cfb, '/xl/styles.xml').content).toString();
    assert.match(sheet, /state="frozen"/);
    assert.match(sheet, /<autoFilter /);
    assert.match(sheet, /Referencias!\$A\$2/);
    assert.match(sheet, /Referencias!\$B\$2/);
    assert.match(sheet, /<conditionalFormatting/);
    assert.match(sheet, / s="1"/);
    assert.match(styles, /FFFFF2B3/);
  });

  await check('exportar → importar el .xlsx: sin cambios', async () => noChanges(await importService.analyze(xlsx, importService.parseOptions(ALL))));
  await check('exportar → guardar como CSV con "," → importar: sin cambios', async () =>
    noChanges(await importService.analyze(Buffer.from(toCsv(xlsx, ',')), importService.parseOptions(ALL)))
  );
  await check('exportar → CSV con ";" y BOM → importar: sin cambios', async () =>
    noChanges(await importService.analyze(Buffer.from('﻿' + toCsv(xlsx, ';')), importService.parseOptions(ALL)))
  );

  await check('acepta números como texto, "1500,50", "$1.500,50", espacios y si/no en minúscula', async () => {
    const [a, b] = await Product.find({ code: { $exists: true } }).sort({ name: 1 }).limit(2).lean();
    const csv = [
      'codigo;nombre;precio;stock;revisar;nota_revision;columna_extra',
      `${a.code};${a.name};"$1.500,50";" 7 ";si;Revisar foto;x`,
      `  ${b.code} ;${b.name};1500,50;0013;no;;`,
      ';;;;;;',
    ].join('\r\n');
    const plan = await importService.analyze(Buffer.from('﻿' + csv), importService.parseOptions({ fields: 'price,stock', updateReview: 'true' }));
    assert.equal(plan.summary.errors, 0, JSON.stringify(plan.errors));
    const byName = Object.fromEntries(plan.toUpdate.map((u) => [u.name, u.set]));
    assert.equal(byName[a.name].price, 1500.5);
    assert.equal(byName[a.name].stock, 7);
    assert.equal(byName[a.name].needsReview, true);
    assert.equal(byName[a.name].reviewNote, 'Revisar foto');
    assert.equal(byName[b.name].price, 1500.5);
    assert.equal(byName[b.name].stock, 13);
  });

  await check('sin "Actualizar marca de revisión", la columna revisar no toca los existentes', async () => {
    const p = await Product.findOne({ needsReview: false }).lean();
    const csv = `nombre,revisar,nota_revision\n${p.name},SI,algo`;
    const plan = await importService.analyze(Buffer.from(csv), importService.parseOptions({ fields: 'price' }));
    assert.equal(plan.summary.update, 0);
  });

  await check('producto nuevo sin precio: se crea con precio 0 y advertencia "Consultar precio"', async () => {
    const csv = 'nombre,categoria,proveedor,precio,stock\nProducto Prueba Nuevo,Snacks,L\'heritier,,\nOtro Producto Con Precio,Snacks,,"1.250",5';
    const plan = await importService.analyze(Buffer.from(csv), importService.parseOptions({ createMissing: 'true' }));
    assert.equal(plan.summary.errors, 0, JSON.stringify(plan.errors));
    const [noPrice, withPrice] = plan.toCreate;
    assert.equal(noPrice.active, true);
    assert.equal(noPrice.price, 0);
    assert.equal(noPrice.warning, importService.NO_PRICE_WARNING);
    assert.equal(noPrice.supplierName, 'Lheritier', 'el proveedor tiene que reconocerse sin apóstrofe');
    assert.equal(withPrice.active, true);
    assert.equal(withPrice.price, 1250);
  });
} finally {
  await mongoose.disconnect();
  await mongo.stop();
}

console.log(failed ? `\n✖ ${failed} prueba(s) fallaron` : '\n✔ Ida y vuelta de la planilla OK');
process.exitCode = failed ? 1 : 0;
