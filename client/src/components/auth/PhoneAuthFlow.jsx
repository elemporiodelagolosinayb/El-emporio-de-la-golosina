import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../api/axios';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { phoneSchema, pinLoginSchema, registerSchema, applyServerErrors } from '../../schemas';
import { normalizePhone, formatPhone } from '../../utils/phone';
import { waLink, waForgotPinMessage } from '../../utils/whatsapp';
import { errorMessage } from '../../utils/format';
import { Field, Icon, Input } from '../ui';

const pinProps = { type: 'password', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 4, placeholder: '••••', className: 'text-center text-2xl tracking-[0.6em]' };

/**
 * Acceso simple: 1) celular → 2a) PIN si existe | 2b) nombre + PIN nuevo si no existe.
 * Se usa en /ingresar y embebido en el checkout (sin sacar al cliente de la página).
 */
export default function PhoneAuthFlow({ onSuccess, compact = false }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const loginStore = useCustomerStore((s) => s.login);

  const done = (data) => {
    loginStore(data.token, data.customer);
    onSuccess?.(data.customer);
  };

  return (
    <div className={compact ? '' : 'card mx-auto max-w-md p-6'}>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {step === 'phone' && (
            <PhoneStep
              onNext={(p, exists) => {
                setPhone(p);
                setStep(exists ? 'pin' : 'register');
              }}
            />
          )}
          {step === 'pin' && <PinStep phone={phone} onBack={() => setStep('phone')} onDone={done} />}
          {step === 'register' && <RegisterStep phone={phone} onBack={() => setStep('phone')} onDone={done} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PhoneStep({ onNext }) {
  const { register, handleSubmit, setError, formState } = useForm({ resolver: zodResolver(phoneSchema) });
  const [serverError, setServerError] = useState('');

  const onSubmit = async ({ phone }) => {
    setServerError('');
    try {
      const { data } = await api.post('/auth/check-phone', { phone: normalizePhone(phone) });
      onNext(data.phone, data.exists);
    } catch (err) {
      if (!applyServerErrors(err, setError)) setServerError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <h2 className="text-2xl text-petrol-dark">Ingresá con tu celular</h2>
        <p className="text-sm text-gray-600">Sin emails ni contraseñas largas. Solo tu número y un PIN de 4 dígitos.</p>
      </div>
      <Field label="Celular" error={formState.errors.phone?.message} hint="Ej: 381 1234567 (con característica, sin 0 ni 15)">
        <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="381 1234567" error={formState.errors.phone} {...register('phone')} autoFocus />
      </Field>
      {serverError && <p className="field-error">{serverError}</p>}
      <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Verificando…' : 'Continuar'}
      </button>
    </form>
  );
}

function PinStep({ phone, onBack, onDone }) {
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);
  const { register, handleSubmit, setError, formState } = useForm({ resolver: zodResolver(pinLoginSchema) });

  const onSubmit = async ({ pin }) => {
    try {
      const { data } = await api.post('/auth/login', { phone, pin });
      onDone(data);
    } catch (err) {
      setError('pin', { message: errorMessage(err, 'PIN incorrecto') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <button type="button" onClick={onBack} className="btn-ghost btn-sm -ml-2">
        <Icon name="chevronLeft" className="h-4 w-4" /> Cambiar número
      </button>
      <div>
        <h2 className="text-2xl text-petrol-dark">¡Hola de nuevo!</h2>
        <p className="text-sm text-gray-600">Ingresá el PIN de 4 dígitos de {formatPhone(phone)}</p>
      </div>
      <Field label="PIN" error={formState.errors.pin?.message}>
        <Input {...pinProps} error={formState.errors.pin} {...register('pin')} autoFocus />
      </Field>
      <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </button>
      <a href={waLink(whatsapp, waForgotPinMessage(formatPhone(phone)))} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-petrol hover:underline">
        <Icon name="whatsapp" className="h-4 w-4" /> Olvidé mi PIN
      </a>
    </form>
  );
}

function RegisterStep({ phone, onBack, onDone }) {
  const { register, handleSubmit, setError, formState } = useForm({ resolver: zodResolver(registerSchema) });
  const [serverError, setServerError] = useState('');

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/auth/register', { phone, ...values });
      onDone(data);
    } catch (err) {
      if (!applyServerErrors(err, setError)) setServerError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <button type="button" onClick={onBack} className="btn-ghost btn-sm -ml-2">
        <Icon name="chevronLeft" className="h-4 w-4" /> Cambiar número
      </button>
      <div>
        <h2 className="text-2xl text-petrol-dark">Creá tu acceso</h2>
        <p className="text-sm text-gray-600">Es la primera vez que ingresás con {formatPhone(phone)}.</p>
      </div>
      <Field label="Nombre y apellido" error={formState.errors.name?.message}>
        <Input autoComplete="name" placeholder="Ej: María López" error={formState.errors.name} {...register('name')} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="PIN (4 dígitos)" error={formState.errors.pin?.message}>
          <Input {...pinProps} autoComplete="new-password" error={formState.errors.pin} {...register('pin')} />
        </Field>
        <Field label="Repetí el PIN" error={formState.errors.pinConfirm?.message}>
          <Input {...pinProps} autoComplete="new-password" error={formState.errors.pinConfirm} {...register('pinConfirm')} />
        </Field>
      </div>
      <p className="text-xs text-gray-500">El PIN protege tus pedidos: así nadie más puede verlos escribiendo tu número.</p>
      {serverError && <p className="field-error">{serverError}</p>}
      <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Creando…' : 'Crear acceso e ingresar'}
      </button>
    </form>
  );
}
