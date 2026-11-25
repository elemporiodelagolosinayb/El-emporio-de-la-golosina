import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/axios';
import { useTitle } from '../hooks';
import { useCustomerStore } from '../store/useCustomerStore';
import { useAdminStore } from '../store/useAdminStore';
import { adminLoginSchema, applyServerErrors } from '../schemas';
import { errorMessage } from '../utils/format';
import PhoneAuthFlow from '../components/auth/PhoneAuthFlow';
import Logo from '../components/layout/Logo';
import { Field, Icon, Input } from '../components/ui';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/useSettingsStore';
import { waLink } from '../utils/whatsapp';

/** Acceso de administradores: email + contraseña (el mismo del panel) */
function AdminLoginForm() {
  const navigate = useNavigate();
  const login = useAdminStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, setError, formState } = useForm({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/admin/auth/login', values);
      login(data.token, data.admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError)) setServerError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <h2 className="text-2xl text-petrol-dark">Acceso administradores</h2>
        <p className="text-sm text-gray-600">Ingresá con tu correo electrónico y contraseña para entrar al panel.</p>
      </div>
      <Field label="Correo electrónico" error={formState.errors.email?.message}>
        <Input type="email" autoComplete="username" placeholder="tu@email.com" error={formState.errors.email} {...register('email')} autoFocus />
      </Field>
      <Field label="Contraseña" error={formState.errors.password?.message}>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} autoComplete="current-password" className="pr-12" error={formState.errors.password} {...register('password')} />
          <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-petrol" aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Icon name={showPass ? 'eyeOff' : 'eye'} className="h-5 w-5" />
          </button>
        </div>
      </Field>
      {serverError && <p className="field-error">{serverError}</p>}
      <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Ingresando…' : 'Entrar al panel'}
      </button>
    </form>
  );
}

/** Golosinas flotando en el fondo (decoración) */
const FLOATERS = [
  { e: '🍭', cls: 'left-[34%] top-[20%] text-5xl', d: 0 },
  { e: '🍬', cls: 'left-[42%] top-[6%] text-3xl', d: 1.1 },
  { e: '🍫', cls: 'right-[8%] top-[10%] text-4xl', d: 0.5 },
  { e: '🍪', cls: 'left-[10%] bottom-[12%] text-4xl', d: 0.8 },
  { e: '⭐', cls: 'right-[44%] bottom-[8%] text-2xl', d: 1.4 },
  { e: '🧁', cls: 'right-[5%] bottom-[16%] text-4xl', d: 0.3 },
];


const TABS = [
  { key: 'customer', label: 'Soy cliente', icon: 'user' },
  { key: 'admin', label: 'Soy administrador', icon: 'key' },
];

export default function Login() {
  useTitle('Ingresar');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const customer = useCustomerStore((s) => s.customer);
  const adminToken = useAdminStore((s) => s.token);
  const whatsapp = useSettingsStore((s) => s.settings.whatsapp);
  const [mode, setMode] = useState(location.state?.mode === 'admin' || params.get('modo') === 'admin' ? 'admin' : 'customer');
  const to = location.state?.from || '/mis-pedidos';

  if (mode === 'customer' && customer) return <Navigate to={to} replace />;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-petrol-dark via-petrol to-sky">
      {/* Fondo: brillos, manchas de color y golosinas flotando */}
      <div className="sparkles absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-bubblegum/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sky/50 blur-3xl" aria-hidden="true" />
      {FLOATERS.map((f) => (
        <motion.span
          key={f.e}
          className={`pointer-events-none absolute hidden select-none drop-shadow-lg md:block ${f.cls}`}
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: f.d, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          {f.e}
        </motion.span>
      ))}

      <div className="container-page relative grid items-center gap-8 py-10 md:grid-cols-[1fr_minmax(0,440px)] md:gap-14 md:py-20">
        {/* Bienvenida */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center text-white md:items-start md:text-left">
          {/* Logo principal (horizontal) */}
          <Logo variant="main" light className="h-20 w-auto max-w-[280px] text-3xl drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] md:h-28 md:max-w-[380px]" />

          <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
            ¡Hola! <span className="text-candy-gold">Qué bueno</span>
            <br className="hidden md:block" /> verte por acá
          </h1>
          <p className="mt-3 max-w-md text-white/90 md:text-lg">Ingresá para hacer tus pedidos mayoristas y seguirlos desde el celular.</p>

        </motion.div>

        {/* Tarjeta de acceso */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
          <div className="absolute -inset-1 rotate-2 rounded-[2.2rem] bg-gradient-to-br from-bubblegum to-candy-gold opacity-70 blur-[2px]" aria-hidden="true" />
          <div className="relative rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] sm:p-8">
            {/* Pestañas con píldora deslizante */}
            <div className="relative mb-6 flex rounded-full bg-sky-light p-1" role="tablist" aria-label="Tipo de acceso">
              {TABS.map((t) => {
                const active = mode === t.key;
                return (
                  <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => setMode(t.key)} className="relative flex-1 rounded-full py-2.5 text-sm font-bold">
                    {active && <motion.span layoutId="login-tab-pill" className="absolute inset-0 rounded-full bg-white shadow" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors ${active ? 'text-bubblegum' : 'text-petrol/70 hover:text-petrol'}`}>
                      <Icon name={t.icon} className="h-4 w-4" /> {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <motion.div key={mode} initial={{ opacity: 0, x: mode === 'admin' ? 16 : -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              {mode === 'customer' ? (
                <PhoneAuthFlow compact onSuccess={() => navigate(to, { replace: true })} />
              ) : adminToken ? (
                <div className="space-y-3 py-4 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint/40 text-petrol-dark">
                    <Icon name="check" className="h-7 w-7" strokeWidth={3} />
                  </span>
                  <p className="font-bold text-petrol-dark">Ya tenés la sesión de administrador abierta.</p>
                  <button type="button" className="btn-primary w-full" onClick={() => navigate('/admin')}>
                    Ir al panel
                  </button>
                </div>
              ) : (
                <AdminLoginForm />
              )}
            </motion.div>

            <p className="mt-6 border-t border-petrol/10 pt-4 text-center text-xs text-gray-500">
              ¿Problemas para ingresar?{' '}
              <a href={waLink(whatsapp, '¡Hola! Tengo problemas para ingresar a la tienda online.')} target="_blank" rel="noreferrer" className="font-bold text-bubblegum hover:underline">
                Escribinos por WhatsApp
              </a>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Ola que une con el fondo de la página */}
      <svg className="relative block h-10 w-full text-cream md:h-16" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40c120 30 240 30 360 10S600 0 720 20s240 50 360 30 240-40 360-20v50H0z" fill="currentColor" />
      </svg>
    </section>
  );
}
