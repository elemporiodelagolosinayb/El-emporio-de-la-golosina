/**
 * Planilla de productos (.xlsx) — la misma que se descarga del admin y la que usa test:import.
 *
 * Hoja "Productos": codigo · nombre · categoria · proveedor · precio · stock · activo · revisar · nota_revision
 *   - encabezado fijo (inmovilizado) y con autofiltro
 *   - filas con revisar = SI pintadas de amarillo (FFF2B3), también si se cambia a SI en el Excel
 *   - desplegables: categoría y proveedor (desde la hoja "Referencias"), activo y revisar (SI/NO)
 * Hoja "Referencias": categorías y proveedores actuales.
 *
 * SheetJS Community no escribe estilos ni validaciones, así que se agregan editando el XML
 * del .xlsx (que es un zip) con la utilidad CFB que trae la misma librería.
 */
import * as XLSX from 'xlsx';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import { COLUMNS, MAX_ROWS } from './import.service.js';

const YELLOW = 'FFFFF2B3';
const HEADER_BG = 'FF1E4F61'; // petróleo de la marca
const COL_WIDTHS = [12, 46, 22, 18, 12, 9, 9, 9, 40];
const col = (name) => String.fromCharCode(65 + COLUMNS.indexOf(name)); // "categoria" → "C"
const LAST_COL = col(COLUMNS[COLUMNS.length - 1]);

const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** rows: [{ codigo, nombre, categoria, proveedor, precio, stock, activo, revisar, nota_revision }] */
function buildWorkbook(rows, categories = [], suppliers = []) {
  const data = [COLUMNS, ...rows.map((r) => COLUMNS.map((c) => r[c] ?? ''))];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = COL_WIDTHS.map((wch) => ({ wch }));
  ws['!autofilter'] = { ref: `A1:${LAST_COL}${Math.max(rows.length + 1, 2)}` };
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  const maxLen = Math.max(categories.length, suppliers.length, 1);
  const ref = [['Categorías', 'Proveedores']];
  for (let i = 0; i < maxLen; i++) ref.push([categories[i] || '', suppliers[i] || '']);
  const wsRef = XLSX.utils.aoa_to_sheet(ref);
  wsRef['!cols'] = [{ wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencias');
  return wb;
}

/** Estilos: 1 = fila amarilla, 2 = encabezado (negrita blanca sobre petróleo) + dxf amarillo para el formato condicional */
function patchStyles(xml) {
  return xml
    .replace(/<fonts count="1">([\s\S]*?)<\/fonts>/, '<fonts count="2">$1<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>')
    .replace(
      /<fills count="2">([\s\S]*?)<\/fills>/,
      `<fills count="4">$1<fill><patternFill patternType="solid"><fgColor rgb="${YELLOW}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="${HEADER_BG}"/><bgColor indexed="64"/></patternFill></fill></fills>`
    )
    .replace(
      /<cellXfs count="1">([\s\S]*?)<\/cellXfs>/,
      '<cellXfs count="3">$1<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
    )
    .replace('<dxfs count="0"/>', `<dxfs count="1"><dxf><fill><patternFill patternType="solid"><bgColor rgb="${YELLOW}"/></patternFill></fill></dxf></dxfs>`);
}

function patchSheet(xml, { reviewRows, categories, suppliers }) {
  const last = MAX_ROWS + 1;
  const range = (c) => `${c}2:${c}${last}`;

  // Encabezado inmovilizado
  xml = xml.replace(
    /<sheetViews>[\s\S]*?<\/sheetViews>/,
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
  );
  // Estilo de celdas: encabezado (fila 1) y filas para revisar
  xml = xml.replace(/<c r="([A-Z]+)(\d+)"/g, (m, c, r) => {
    if (r === '1') return `${m} s="2"`;
    return reviewRows.has(Number(r)) ? `${m} s="1"` : m;
  });

  // Formato condicional (si en el Excel se cambia "revisar" a SI, la fila se pinta sola) + desplegables
  const cf = `<conditionalFormatting sqref="A2:${LAST_COL}${last}"><cfRule type="expression" dxfId="0" priority="1"><formula>UPPER(TRIM($${col('revisar')}2))="SI"</formula></cfRule></conditionalFormatting>`;
  const lists = [
    categories.length && { sqref: range(col('categoria')), formula: `Referencias!$A$2:$A$${categories.length + 1}` },
    suppliers.length && { sqref: range(col('proveedor')), formula: `Referencias!$B$2:$B$${suppliers.length + 1}` },
    { sqref: `${range(col('activo'))} ${range(col('revisar'))}`, formula: '"SI,NO"' },
  ].filter(Boolean);
  const dv = `<dataValidations count="${lists.length}">${lists
    .map(
      (v) =>
        `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Valor inválido" error="Elegí un valor de la lista" sqref="${v.sqref}"><formula1>${escapeXml(v.formula)}</formula1></dataValidation>`
    )
    .join('')}</dataValidations>`;

  // Orden que exige Excel: … sheetData, autoFilter, conditionalFormatting, dataValidations, ignoredErrors/pageMargins …
  const anchor = ['<ignoredErrors', '<pageMargins', '</worksheet>'].find((a) => xml.includes(a));
  return xml.replace(anchor, `${cf}${dv}${anchor}`);
}

/** Devuelve el .xlsx listo para descargar (Buffer) */
export function buildProductsXlsx(rows, categories = [], suppliers = []) {
  const wb = buildWorkbook(rows, categories, suppliers);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  try {
    const cfb = XLSX.CFB.read(buffer, { type: 'buffer' });
    const sheet = XLSX.CFB.find(cfb, '/xl/worksheets/sheet1.xml');
    const styles = XLSX.CFB.find(cfb, '/xl/styles.xml');
    const reviewRows = new Set(rows.map((r, i) => (String(r.revisar).toUpperCase() === 'SI' ? i + 2 : null)).filter(Boolean));
    const set = (entry, xml) => {
      entry.content = Buffer.from(xml, 'utf8');
      entry.size = entry.content.length;
    };
    set(sheet, patchSheet(Buffer.from(sheet.content).toString('utf8'), { reviewRows, categories, suppliers }));
    set(styles, patchStyles(Buffer.from(styles.content).toString('utf8')));
    return Buffer.from(XLSX.CFB.write(cfb, { fileType: 'zip', type: 'buffer' }));
  } catch (err) {
    console.error('No se pudieron agregar estilos a la planilla:', err.message);
    return buffer; // se descarga igual, sin colores ni desplegables
  }
}

/** Producto (lean + populate) → fila de la planilla */
export const toSheetRow = (p) => ({
  codigo: p.code || '',
  nombre: p.name,
  categoria: p.category?.name || '',
  proveedor: p.supplier?.name || '',
  precio: p.price,
  stock: p.stock,
  activo: p.active ? 'SI' : 'NO',
  revisar: p.needsReview ? 'SI' : 'NO',
  nota_revision: p.reviewNote || '',
});

/** Catálogo completo como .xlsx (todas las categorías/proveedores en "Referencias") */
export async function exportProductsXlsx() {
  const [items, categories, suppliers] = await Promise.all([
    Product.find({}).populate('category', 'name').populate('supplier', 'name').sort({ name: 1 }).lean(),
    Category.find({}, 'name').sort({ order: 1, name: 1 }).lean(),
    Supplier.find({}, 'name').sort({ order: 1, name: 1 }).lean(),
  ]);
  return buildProductsXlsx(
    items.map(toSheetRow),
    categories.map((c) => c.name),
    suppliers.map((s) => s.name)
  );
}

export const XLSX_MIME ='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
