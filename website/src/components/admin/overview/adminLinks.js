import { useParams } from 'react-router';

// Where each admin section lives. Edit the right-hand side if your routes differ
// (or swap this for the helpers in router/path.js).  Pattern: /team/:username/<slug>
export const ADMIN_SECTIONS = {
  overview: '',
  orders: 'orders',
  products: 'products',
  users: 'users',
  alerts: 'alerts',
  carts: 'carts',      // Cart & wishlist page
  finance: 'finance',
  settings: 'settings',
  reviews: 'products', // there is no reviews page yet, so this opens Products
};

// const link = useAdminLink();   <Link to={link('orders')}>
export function useAdminLink() {
  const { username } = useParams();
  const base = username ? `/team/${username}` : '/team';
  return (section) => {
    const slug = ADMIN_SECTIONS[section] ?? section;
    return slug ? `${base}/${slug}` : base;
  };
}