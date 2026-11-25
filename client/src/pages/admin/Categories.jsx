import NamedEntityPage from './NamedEntityPage';

const cfg = { title: 'Categorías', endpoint: 'categories', singular: 'categoría', hasIcon: true, hasLogo: false, allowNone: false, productFilterKey: 'category' };

export default function Categories() {
  return <NamedEntityPage cfg={cfg} />;
}
