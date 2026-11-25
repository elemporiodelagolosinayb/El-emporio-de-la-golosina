import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useCartValidation } from '../hooks/useCartValidation';
import { useCartStore, cartTotal, cartPricePending } from '../store/useCartStore';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { checkoutSchema } from '../schemas';
import { formatPrice, itemPrice, errorMessage } from '../utils/format';
import { formatPhone, normalizePhone } from '../utils/phone';
import { alertError, confirmAction } from '../utils/alerts';
import PhoneAuthFlow from '../components/auth/PhoneAuthFlow';
import { Field, Icon, Input, Spinner, Textarea } from '../components/ui';

export default function Checkout() {
  useTitle('Confirmar pedido');
  const navigate = useNavigate();
  const { items, validate, validating } = useCartValidation();
  const clear = useCartStore((s) => s.clear);
  const { customer, logout } = useCustomerStore();
  const settings = useSettingsStore((s) => s.settings);
  const [sending, setSending] = useState(false);
  const { register, handleSubmit, watch, reset, getValues, formState } = useForm({ resolver: zodResolver(checkoutSchema), defaultValues: { name: '', phone: '', notes: '' } });

  // Al ingresar, se completan con los datos de la cuenta (se pueden corregir)
  useEffect(() => {
    if (customer) reset({ ...getValues(), name: customer.name || '', phone: formatPhone(customer.phone) });
  }, [customer?.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  const notesLen = (watch('notes') || '').length;

  const total = cartTotal(items);
  const pricePending = cartPricePending(items);
  const belowMin = !pricePending && settings.minOrderAmount > 0 && total < settings.minOrderAmount;

  if (!items.length && !sending) return <Navigate to="/carrito" replace />;

  const onSubmit = async ({ name, phone, notes }) => {
    if (!customer) return;
    setSending(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ type: i.type, id: i.id, quantity: i.quantity, price: i.price })),
        name: name.replace(/\s+/g, ' ').trim(),
        phone: normalizePhone(phone),
        notes,
      });
      if (name.trim() !== customer.name) useCustomerStore.setState({ customer: { ...customer, name: name.replace(/\s+/g, ' ').trim() } });
      clear();
      navigate(`/pedido-confirmado/${data.order.orderNumber}`, { replace: true, state: { order: data.order } });
    } catch (err) {
      setSending(false);
      if (err.response?.status === 409) {
        await alertError(errorMessage(err), 'Revisá tu pedido');
        await validate();
      } else {
        alertError(errorMessage(err));
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <h1 className="text-3xl text-petrol">Confirmar pedido</h1>

        {/* Paso 1: datos del cliente (acceso por celular sin salir del checkout) */}
        <section className={`card p-5 ${customer ? '' : 'pointer-events-none opacity-50'}`}>
          <h2 className="mb-3 flex items-center gap-2 text-xl text-petrol-dark">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-petrol text-sm text-white">1</span> Tus datos
          </h2>
          {customer ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Confirmá tus datos: los usamos para el pedido y para coordinar el pago y el envío.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre completo *" error={formState.errors.name?.message} hint="Nombre y apellido">
                  <Input autoComplete="name" placeholder="Ej: María López" error={formState.errors.name} {...register('name')} />
                </Field>
                <Field label="Celular *" error={formState.errors.phone?.message} hint="Con característica, sin 0 ni 15">
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="381 1234567" error={formState.errors.phone} {...register('phone')} />
                </Field>
              </div>
              <button type="button" className="text-sm font-bold text-petrol underline-offset-2 hover:underline" onClick={async () => (await confirmAction('¿Usar otra cuenta?', 'Vas a cerrar la sesión actual.', 'Cambiar')) && logout()}>
                No soy {customer.name?.split(' ')[0] || 'yo'} · usar otra cuenta
              </button>
            </div>
          ) : (
            <PhoneAuthFlow compact />
          )}
        </section>

        {/* Paso 2: observaciones */}
        <section className={`card p-5 ${customer ? '' : 'pointer-events-none opacity-50'}`}>
          <h2 className="mb-3 flex items-center gap-2 text-xl text-petrol-dark">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-petrol text-sm text-white">2</span> Observaciones (opcional)
          </h2>
          <Field error={formState.errors.notes?.message} hint={`${notesLen}/300`}>
            <Textarea placeholder="Ej: horario para recibir, aclaraciones del pedido…" maxLength={300} error={formState.errors.notes} {...register('notes')} />
          </Field>
        </section>

        <section className="card flex gap-3 bg-sky-light p-5">
          <Icon name="bank" className="h-6 w-6 shrink-0 text-petrol" />
          <div className="text-sm">
            <p className="font-extrabold text-petrol-dark">Pago por transferencia bancaria</p>
            <p className="text-gray-700">Al confirmar te mostramos los datos para transferir. Después enviás el comprobante por WhatsApp y coordinamos el envío por Uber Moto.</p>
          </div>
        </section>
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-28">
        <h2 className="mb-3 text-xl text-petrol-dark">Tu pedido</h2>
        {validating && (
          <p className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Spinner className="h-4 w-4" /> Revalidando…
          </p>
        )}
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
          {items.map((i) => (
            <li key={`${i.type}:${i.id}`} className="flex justify-between gap-2">
              <span className="min-w-0">
                <span className="font-extrabold text-petrol">{i.quantity}×</span> {i.name}
              </span>
              <span className="shrink-0 font-bold">{itemPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end justify-between border-t border-sky-light pt-3">
          <span className="font-bold">Total</span>
          <span className="text-3xl font-black text-bubblegum">{formatPrice(total)}</span>
        </div>
        <div>
          {pricePending && <p className="mt-1 text-xs font-bold text-petrol">+ productos con precio a confirmar: te pasamos el total final por WhatsApp.</p>}
        </div>
        {belowMin && <p className="mt-3 rounded-xl bg-candy-gold/25 p-3 text-sm font-bold">El pedido mínimo es de {formatPrice(settings.minOrderAmount)}.</p>}
        <button type="button" onClick={handleSubmit(onSubmit)} className="btn-buy mt-4 w-full py-3 text-lg" disabled={!customer || sending || validating || belowMin}>
          {sending ? 'Enviando pedido…' : customer ? 'Confirmar pedido' : 'Ingresá para confirmar'}
        </button>
        <Link to="/carrito" className="btn-ghost mt-2 w-full">
          Volver al carrito
        </Link>
      </aside>
    </div>
  );
}
