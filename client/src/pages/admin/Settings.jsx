import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios';
import { useApi } from '../../hooks/useApi';
import { useSettingsStore } from '../../store/useSettingsStore';
import { settingsSchema, applyServerErrors } from '../../schemas';
import { normalizePhone } from '../../utils/phone';
import { DAY_NAMES, scheduleSummary } from '../../utils/schedule';
import { errorMessage } from '../../utils/format';
import { notifySuccess, alertError, confirmDelete } from '../../utils/alerts';
import { PageHeader, ImageUploader } from '../../components/admin';
import { Field, Icon, Input, PageLoader, Textarea } from '../../components/ui';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function Section({ title, children }) {
  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-xl text-petrol-dark">{title}</h2>
      {children}
    </section>
  );
}

/** Logos: se suben directo a Cloudinary y se guardan apenas cambian */
function LogoField({ type, label, hint, value, onSaved }) {
  const isHome = type === 'home';
  const what = isHome ? 'La foto del inicio' : 'El logo';
  const [current, setCurrent] = useState(value);
  useEffect(() => setCurrent(value), [value]);

  const onChange = async (img) => {
    try {
      if (img) {
        const { data } = await api.put(`/admin/settings/logo/${type}`, img);
        onSaved(data.settings);
        notifySuccess(`${what} se actualizó`);
      } else {
        if (!(await confirmDelete(isHome ? 'la foto del inicio' : 'el logo', isHome ? 'El inicio vuelve a mostrar el diseño de colores sin foto.' : 'Si no hay logo, el sitio muestra el nombre del negocio en texto.'))) return;
        const { data } = await api.delete(`/admin/settings/logo/${type}`);
        onSaved(data.settings);
        notifySuccess(`${what} se eliminó`);
      }
    } catch (err) {
      alertError(errorMessage(err));
    }
  };

  return (
    <div>
      <ImageUploader
        value={current}
        onChange={onChange}
        folder={isHome ? 'emporio/home' : 'emporio/logos'}
        label={label}
        aspect={type === 'topbar' ? 'aspect-square' : isHome ? 'aspect-[16/10]' : 'aspect-[3/1]'}
        contain={!isHome}
        wide={isHome}
        maxWidth={isHome ? 1920 : 1200}
      />
      <p className={`mt-1 text-xs text-gray-500 ${isHome ? 'max-w-[460px]' : 'max-w-[220px]'}`}>{hint}</p>
    </div>
  );
}

function DayRow({ control, register, index, watch, setValue, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: `schedule.${index}.ranges` });
  const day = watch(`schedule.${index}.day`);
  const closed = watch(`schedule.${index}.closed`);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-sky-light py-2">
      <span className="w-24 font-extrabold">{DAY_NAMES[day]}</span>
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={closed} onChange={(e) => setValue(`schedule.${index}.closed`, e.target.checked, { shouldDirty: true })} /> Cerrado
      </label>
      {!closed && (
        <div className="flex flex-wrap items-center gap-2">
          {fields.map((f, ri) => (
            <span key={f.id} className="flex items-center gap-1 rounded-xl bg-sky-light/60 px-2 py-1">
              <input type="time" className="input w-28 px-2 py-1" {...register(`schedule.${index}.ranges.${ri}.open`)} />
              <span>a</span>
              <input type="time" className="input w-28 px-2 py-1" {...register(`schedule.${index}.ranges.${ri}.close`)} />
              <button type="button" className="rounded-full p-1 text-red-600 hover:bg-red-50" onClick={() => remove(ri)} aria-label="Quitar franja"><Icon name="close" className="h-4 w-4" /></button>
            </span>
          ))}
          {fields.length < 2 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => append({ open: '17:00', close: '21:00' })}>
              <Icon name="plus" className="h-4 w-4" /> Franja
            </button>
          )}
        </div>
      )}
      {errors?.schedule?.[index]?.ranges && <span className="field-error">Revisá las horas (el cierre debe ser posterior a la apertura)</span>}
    </div>
  );
}

export default function Settings() {
  const { data, loading, setData } = useApi('/admin/settings');
  const invalidate = useSettingsStore((s) => s.invalidate);
  const fetchPublic = useSettingsStore((s) => s.fetch);
  const { register, handleSubmit, reset, control, watch, setValue, setError, formState } = useForm({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    if (!data?.settings) return;
    const s = data.settings;
    const schedule = DAY_ORDER.map((d) => {
      const found = s.schedule?.find((x) => x.day === d);
      return { day: d, closed: found?.closed ?? d === 0, ranges: found?.ranges?.map((r) => ({ open: r.open, close: r.close })) || [] };
    });
    reset({
      topbarText: s.topbarText || '',
      address: s.address || '',
      mapsUrl: s.mapsUrl || '',
      scheduleText: s.scheduleText || '',
      instagram: s.instagram || '',
      facebook: s.facebook || '',
      tiktok: s.tiktok || '',
      whatsapp: s.whatsapp || '',
      lowStockThreshold: s.lowStockThreshold ?? 5,
      minOrderAmount: s.minOrderAmount ?? 0,
      postPurchaseMessage: s.postPurchaseMessage || '',
      bank: { alias: s.bank?.alias || '', cbu: s.bank?.cbu || '', holder: s.bank?.holder || '', bankName: s.bank?.bankName || '' },
      schedule,
    });
  }, [data, reset]);

  const { fields: days } = useFieldArray({ control, name: 'schedule' });

  const onSubmit = async (v) => {
    const payload = {
      ...v,
      whatsapp: normalizePhone(v.whatsapp),
      schedule: v.schedule.map((d) => ({ ...d, ranges: d.closed ? [] : d.ranges })),
    };
    try {
      const { data: res } = await api.put('/admin/settings', payload);
      setData({ ...data, settings: res.settings });
      invalidate();
      fetchPublic(true);
      notifySuccess('Configuración guardada');
    } catch (err) {
      if (!applyServerErrors(err, setError)) alertError(errorMessage(err));
    }
  };

  const onLogoSaved = (settings) => {
    setData({ ...data, settings: { ...data.settings, logoTopbar: settings.logoTopbar, logoMain: settings.logoMain, homeImage: settings.homeImage } });
    invalidate();
    fetchPublic(true);
  };

  if (loading || !data) return <PageLoader />;
  const e = formState.errors;
  const s = data.settings;
  const sched = watch('schedule');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 pb-20">
      <PageHeader title="Configuración" subtitle="Todo lo que se ve en la tienda se edita desde acá." />

      <Section title="Logos">
        <div className="flex flex-wrap gap-8">
          <LogoField type="topbar" label="Logo franja superior (circular)" hint="Se usa en la franja superior, el favicon y el login. Recomendado: PNG con fondo transparente." value={s.logoTopbar?.url ? s.logoTopbar : null} onSaved={onLogoSaved} />
          <LogoField type="main" label="Logo principal (horizontal)" hint="Se usa en el navbar y el footer. Recomendado: PNG con fondo transparente." value={s.logoMain?.url ? s.logoMain : null} onSaved={onLogoSaved} />
        </div>
      </Section>

      <Section title="Franja superior y contacto">
        <Field label="Texto de la franja superior" error={e.topbarText?.message}><Input error={e.topbarText} {...register('topbarText')} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Dirección" error={e.address?.message}><Input error={e.address} {...register('address')} /></Field>
          <Field label="Link de Google Maps" error={e.mapsUrl?.message}><Input error={e.mapsUrl} {...register('mapsUrl')} /></Field>
          <Field label="WhatsApp del negocio" error={e.whatsapp?.message} hint="Se normaliza a 549XXXXXXXXXX"><Input type="tel" error={e.whatsapp} {...register('whatsapp')} /></Field>
          <Field label="Instagram" error={e.instagram?.message}><Input error={e.instagram} {...register('instagram')} /></Field>
          <Field label="Facebook (opcional)" error={e.facebook?.message}><Input error={e.facebook} {...register('facebook')} /></Field>
          <Field label="TikTok (opcional)" error={e.tiktok?.message}><Input error={e.tiktok} {...register('tiktok')} /></Field>
        </div>
      </Section>

      <Section title="Horarios de atención">
        <div>
          {days.map((d, i) => (
            <DayRow key={d.id} control={control} register={register} index={i} watch={watch} setValue={setValue} errors={e} />
          ))}
        </div>
        {sched && <p className="text-sm text-gray-600">Vista previa: <b>{scheduleSummary(sched)}</b></p>}
        <Field label="Texto de horario (footer)" error={e.scheduleText?.message} hint="Ej: Lunes a Sábado de 8:30 a 13 h y de 17 a 21 h">
          <Input error={e.scheduleText} {...register('scheduleText')} />
        </Field>
      </Section>

      <Section title="Datos de transferencia">
        {!watch('bank.alias') && <p className="rounded-xl bg-candy-gold/25 p-3 text-sm font-bold">Mientras el alias esté vacío, al confirmar el pedido se muestra: “Te enviamos los datos de transferencia por WhatsApp”.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Alias" error={e.bank?.alias?.message} hint="6 a 20 caracteres: letras, números, puntos y guiones"><Input error={e.bank?.alias} {...register('bank.alias')} /></Field>
          <Field label="CBU / CVU (opcional)" error={e.bank?.cbu?.message}><Input inputMode="numeric" maxLength={22} error={e.bank?.cbu} {...register('bank.cbu')} /></Field>
          <Field label="Titular" error={e.bank?.holder?.message}><Input error={e.bank?.holder} {...register('bank.holder')} /></Field>
          <Field label="Banco" error={e.bank?.bankName?.message}><Input error={e.bank?.bankName} {...register('bank.bankName')} /></Field>
        </div>
      </Section>

      <Section title="Tienda">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Stock bajo" error={e.lowStockThreshold?.message} hint='Con este stock o menos se muestra "Últimas unidades"'><Input type="number" min="0" error={e.lowStockThreshold} {...register('lowStockThreshold')} /></Field>
          <Field label="Pedido mínimo ($)" error={e.minOrderAmount?.message} hint="0 = sin mínimo"><Input type="number" min="0" step="0.01" error={e.minOrderAmount} {...register('minOrderAmount')} /></Field>
        </div>
        <Field label="Mensaje post-compra" error={e.postPurchaseMessage?.message}><Textarea maxLength={400} {...register('postPurchaseMessage')} /></Field>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sky-light bg-white/95 p-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end gap-3">
          {formState.isDirty && <span className="text-sm font-bold text-bubblegum">Tenés cambios sin guardar</span>}
          <button type="submit" className="btn-buy" disabled={formState.isSubmitting}>{formState.isSubmitting ? 'Guardando…' : 'Guardar configuración'}</button>
        </div>
      </div>
    </form>
  );
}
