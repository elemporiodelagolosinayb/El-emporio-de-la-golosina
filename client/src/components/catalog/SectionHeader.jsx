import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../ui/Icon';

/**
 * Título de sección: ícono tipo "frasco" + etiqueta + título
 * y un botoncito "Ver todo" opcional.
 */
export default function SectionHeader({ icon, eyebrow, title, subtitle, to, linkLabel = 'Ver todo', center = false, id }) {
  return (
    <div id={id} className={`mb-6 flex flex-wrap items-end gap-3 ${center ? 'flex-col items-center text-center' : 'justify-between'}`}>
      <div className={`flex gap-3 ${center ? 'flex-col items-center' : 'items-center'}`}>
        {icon && (
          <motion.span
            initial={{ rotate: -45, scale: 0.4, opacity: 0 }}
            whileInView={{ rotate: -6, scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', damping: 10, stiffness: 160 }}
            whileHover={{ rotate: [-6, 8, -10, -6], transition: { duration: 0.5 } }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-card ring-1 ring-petrol/5"
            aria-hidden="true"
          >
            {icon}
          </motion.span>
        )}
        <div className={center ? 'flex flex-col items-center' : ''}>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="section-title leading-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-[15px] text-gray-600">{subtitle}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-petrol shadow-card transition hover:bg-petrol hover:text-white">
          {linkLabel} <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
