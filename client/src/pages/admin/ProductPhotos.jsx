import { useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { slugify, normalizeText } from '../../utils/text';
import { validateImage, uploadToCloudinary, getSignature, cld } from '../../utils/cloudinary';
import { errorMessage } from '../../utils/format';
import { alertError, alertInfo } from '../../utils/alerts';
import { PageHeader } from '../../components/admin';
import { Icon, Pagination, Spinner } from '../../components/ui';
import { usePaged } from '../../hooks/usePaged';

const CONCURRENCY = 4;
const baseName = (name) => name.replace(/\.[^.]+$/, '');

/**
 * Asocia cada archivo a un producto por nombre de archivo.
 * Prioridad: código (exacto, sin importar mayúsculas) → nombre normalizado.
 */
function matchFiles(files, products) {
  const byCode = new Map(products.filter((p) => p.code).map((p) => [normalizeText(p.code), p]));
  const byName = new Map(products.map((p) => [p.normalizedName, p]));
  const usedProducts = new Set();
  return files.map((file) => {
    const invalid = validateImage(file);
    if (invalid) return { file, status: 'invalid', reason: invalid };
    const base = baseName(file.name);
    const product = byCode.get(normalizeText(base)) || byName.get(slugify(base));
    if (!product) return { file, status: 'nomatch' };
    if (usedProducts.has(product._id)) return { file, status: 'duplicate', product };
    usedProducts.add(product._id);
    return { file, status: 'match', product, preview: URL.createObjectURL(file) };
  });
}

export default function ProductPhotos() {
  const inputRef = useRef(null);
  const { data, loading, reload } = useApi('/admin/products/lookup');
  const products = data?.items || [];
  const [rows, setRows] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [onlyMissing, setOnlyMissing] = useState(true);

  const addFiles = (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setRows((prev) => {
      prev.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));
      const all = [...prev.map((r) => r.file), ...files];
      // evitar el mismo archivo dos veces
      const unique = all.filter((f, i) => all.findIndex((x) => x.name === f.name && x.size === f.size) === i);
      return matchFiles(unique, products);
    });
  };

  const matched = rows.filter((r) => r.status === 'match');
  const toUpload = matched.filter((r) => overwrite || !r.product.hasImage);
  const missing = useMemo(() => products.filter((p) => !p.hasImage), [products]);

  const upload = async () => {
    if (!toUpload.length) return;
    setProgress({ done: 0, total: toUpload.length });
    const results = [];
    const failed = [];
    try {
      const signature = await getSignature('emporio/productos'); // una firma para todo el lote
      let index = 0;
      // Lotes en paralelo (CONCURRENCY a la vez)
      const worker = async () => {
        while (index < toUpload.length) {
          const r = toUpload[index++];
          try {
            const img = await uploadToCloudinary(r.file, 'emporio/productos', { signature });
            results.push({ productId: r.product._id, ...img });
          } catch (e) {
            failed.push(`${r.file.name}: ${e.message}`);
          }
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toUpload.length) }, worker));

      // Guardar en el back en tandas
      let saved = 0;
      for (let i = 0; i < results.length; i += 200) {
        const { data: res } = await api.post('/admin/products/images', { items: results.slice(i, i + 200), overwrite });
        saved += res.saved;
      }
      await alertInfo('Fotos cargadas', `Se guardaron <b>${saved}</b> foto(s).${failed.length ? `<br><br>Fallaron ${failed.length}:<br><small>${failed.join('<br>')}</small>` : ''}`);
      rows.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));
      setRows([]);
      reload();
    } catch (err) {
      alertError(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  const counts = {
    match: matched.length,
    nomatch: rows.filter((r) => r.status === 'nomatch').length,
    invalid: rows.filter((r) => r.status === 'invalid' || r.status === 'duplicate').length,
  };
  const visible = onlyMissing ? missing : products;
  const rowsPaged = usePaged(rows, 25, rows.length);
  const listPaged = usePaged(visible, 30, onlyMissing);

  return (
    <div className="space-y-5">
      <PageHeader title="Carga masiva de fotos" subtitle="Nombrá cada archivo igual que el producto o su código. Ej: alfajor-jorgito-chocolate.jpg o ALF001.jpg" />

      <section className="card space-y-4 p-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          disabled={loading || progress}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky bg-sky-light/50 p-10 text-petrol"
        >
          {loading ? <Spinner /> : <Icon name="image" className="h-10 w-10" />}
          <span className="font-bold">Elegí o arrastrá muchas imágenes juntas</span>
          <span className="text-xs text-gray-500">JPG, PNG o WEBP · máx 5 MB c/u · se comprimen a 1200px antes de subir</span>
        </button>
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="badge bg-mint text-petrol-dark">✅ {counts.match} con producto</span>
              <span className="badge bg-candy-gold text-ink">⚠️ {counts.nomatch} sin producto (no se suben)</span>
              {counts.invalid > 0 && <span className="badge bg-red-100 text-red-700">❌ {counts.invalid} inválidas / repetidas</span>}
              <label className="ml-auto flex items-center gap-2">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4 accent-[#CE5487]" />
                Sobrescribir fotos existentes
              </label>
            </div>

            <div className="overflow-auto rounded-2xl border border-sky-light">
              <table className="table">
                <thead><tr><th>Archivo</th><th>Producto</th><th>Estado</th></tr></thead>
                <tbody>
                  {rowsPaged.items.map((r) => (
                    <tr key={r.file.name + r.file.size}>
                      <td>
                        <div className="flex items-center gap-2">
                          {r.preview && <img src={r.preview} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                          <span className="max-w-[220px] truncate">{r.file.name}</span>
                        </div>
                      </td>
                      <td>{r.product?.name || '—'}</td>
                      <td>
                        {r.status === 'match' && (r.product.hasImage ? (overwrite ? <span className="text-bubblegum">✅ Reemplaza la foto actual</span> : <span className="text-gray-500">⏭️ Ya tiene foto (se omite)</span>) : <span className="text-petrol">✅ Lista para subir</span>)}
                        {r.status === 'nomatch' && <span className="text-candy-gold">⚠️ No coincide con ningún producto</span>}
                        {r.status === 'invalid' && <span className="text-red-600">❌ {r.reason}</span>}
                        {r.status === 'duplicate' && <span className="text-red-600">❌ Otro archivo ya apunta a este producto</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={rowsPaged.page} pages={rowsPaged.pages} onChange={rowsPaged.setPage} className="mt-3" />

            {progress && (
              <div>
                <div className="h-3 overflow-hidden rounded-full bg-sky-light">
                  <div className="h-full rounded-full bg-bubblegum transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
                <p className="mt-1 text-sm font-bold text-petrol">Subiendo {progress.done} de {progress.total}…</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setRows([])} disabled={Boolean(progress)}>Limpiar</button>
              <button type="button" className="btn-buy" onClick={upload} disabled={!toUpload.length || Boolean(progress)}>
                <Icon name="upload" className="h-4 w-4" /> Subir {toUpload.length} foto(s)
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg text-petrol-dark">Productos sin foto ({missing.length})</h2>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={!onlyMissing} onChange={(e) => setOnlyMissing(!e.target.checked)} /> Mostrar todos
          </label>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {listPaged.items.map((p) => (
              <div key={p._id} className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-sky-light/60">
                {p.image ? <img src={cld(p.image, 60)} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded bg-sky-light text-gray-400"><Icon name="image" className="h-4 w-4" /></span>}
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <code className="max-w-[45%] truncate text-[11px] text-gray-400" title="Nombre de archivo sugerido">{p.code || p.normalizedName}</code>
              </div>
            ))}
          </div>
        )}
        {!loading && <Pagination page={listPaged.page} pages={listPaged.pages} onChange={listPaged.setPage} className="mt-4" />}
      </section>
    </div>
  );
}
