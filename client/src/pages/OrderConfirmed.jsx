import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatPrice } from '../utils/format';
import { waLink, waProofMessage, markReceiptSent } from '../utils/whatsapp';
import { notifySuccess } from '../utils/alerts';
import { EmptyState, Icon, PageLoader } from '../components/ui';

function CopyRow({ label, value, big }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess(`${label} copiado`);
    } catch {
      /* el navegador no permite copiar */
    }
  };
  return (
    // En celular el botón baja a otra línea: el alias/CBU nunca se corta a la mitad
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl bg-white p-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
        <p className={`font-black text-petrol-dark ${big ? 'text-xl sm:text-2xl' : 'break-all'}`}>{value}</p>
      </div>
      <button type="button" onClick={copy} className={big ? 'btn-buy btn-sm shrink-0' : 'btn-outline btn-sm shrink-0'}>
        <Icon name="copy" className="h-4 w-4" /> {big ? `Copiar ${label.toLowerCase()}` : 'Copiar'}
      </button>
    </div>
  );
}

export default function OrderConfirmed() {
  useTitle('Pedido recibido');
  const { orderNumber } = useParams();
  const location = useLocation();
  const settings = useSettingsStore((s) => s.settings);
  const fetchSettings = useSettingsStore((s) => s.fetch);
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    fetchSettings(true); // datos bancarios siempre frescos
    if (order) return;
    api
      .get(`/orders/mine/${orderNumber}`)
      .then(({ data }) => setOrder(data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (loading) return <PageLoader />;
  if (!order) return <EmptyState title="No encontramos el pedido" />;

  const { bank } = settings;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl space-y-5">
      <div className="card overflow-hidden text-center">
        {/* El brillo va en una capa aparte: si comparten la clase, los puntitos tapan el degradé */}
        <div className="relative bg-gradient-to-br from-sky to-petrol px-6 py-8 text-white">
          <div className="sparkles absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-mint text-petrol-dark">
            <Icon name="check" className="h-9 w-9" strokeWidth={3} />
          </motion.div>
          <h1 className="text-3xl">¡Pedido recibido!</h1>
          <p className="mt-1 text-lg font-bold">N.º {order.orderNumber}</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm font-bold uppercase text-gray-500">{order.status === 'pago_confirmado' ? 'Total pagado' : 'Total a transferir'}</p>
          <p className="text-4xl font-black text-bubblegum">{formatPrice(order.total)}</p>
          {order.pricePending && <p className="mt-1 text-sm font-bold text-petrol">+ productos con precio a confirmar: te pasamos el total final por WhatsApp.</p>}
        </div>
      </div>

      <section className="card space-y-2 bg-sky-light p-5">
        <h2 className="flex items-center gap-2 text-xl text-petrol-dark">
          <Icon name="bank" /> Datos para transferir
        </h2>
        {bank?.alias ? (
          <>
            <CopyRow label="Alias" value={bank.alias} big />
            {bank.cbu && <CopyRow label="CBU/CVU" value={bank.cbu} />}
            {(bank.holder || bank.bankName) && (
              <div className="rounded-2xl bg-white p-3 text-sm">
                {bank.holder && (
                  <p>
                    <b>Titular:</b> {bank.holder}
                  </p>
                )}
                {bank.bankName && (
                  <p>
                    <b>Banco:</b> {bank.bankName}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-white p-4 font-bold">Te enviamos los datos de transferencia por WhatsApp.</p>
        )}
      </section>

      <section className="card space-y-3 p-5 text-center">
        <p className="font-bold text-petrol-dark">{settings.postPurchaseMessage}</p>
        {order.status === 'pago_confirmado' && (
          <p className="rounded-2xl bg-mint/40 p-4 font-extrabold text-petrol-dark">
            <Icon name="check" className="mr-1 inline h-5 w-5" /> ¡Pago confirmado! Ya estamos preparando tu pedido. Coordinamos el envío por WhatsApp.
          </p>
        )}
        <a
          href={waLink(settings.whatsapp, waProofMessage(order))}
          target="_blank"
          rel="noreferrer"
          onClick={async () => {
            const updated = await markReceiptSent(order);
            if (updated) setOrder(updated);
          }}
          className="btn-wa w-full py-3 text-lg"
        >
          <Icon name="whatsapp" className="h-6 w-6" /> {order.pricePending ? "Pedir el total por WhatsApp" : "Enviar comprobante por WhatsApp"}
        </a>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link to={`/mis-pedidos/${order.orderNumber}`} className="btn-outline btn-sm">
            Ver detalle del pedido
          </Link>
          <Link to="/catalogo" className="btn-ghost btn-sm">
            Seguir comprando
          </Link>
        </div>
      </section>
    </motion.div>
  );
}
