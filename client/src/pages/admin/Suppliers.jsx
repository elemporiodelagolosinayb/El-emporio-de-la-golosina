import NamedEntityPage from './NamedEntityPage';

const cfg = { title: 'Proveedores / Marcas', endpoint: 'suppliers', singular: 'proveedor', hasIcon: false, hasLogo: true, allowNone: true, productFilterKey: 'supplier' };

export default function Suppliers() {
  return <NamedEntityPage cfg={cfg} />;
}
