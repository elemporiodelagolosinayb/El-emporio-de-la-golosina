import { Link } from 'react-router-dom';
import { useTitle } from '../hooks';

export default function NotFound() {
  useTitle('Página no encontrada');
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl text-bubblegum">404</p>
      <h1 className="mt-2 text-3xl text-petrol">¡Ups! Esta golosina no está</h1>
      <p className="mt-2 max-w-md text-gray-600">La página que buscás no existe o se mudó de estante.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">
          Ir al inicio
        </Link>
        <Link to="/catalogo" className="btn-buy">
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
