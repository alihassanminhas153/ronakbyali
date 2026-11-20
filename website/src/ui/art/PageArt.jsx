import OverviewArt from "./OverviewArt";
import ProductsArt from "./ProductsArt";
import OrdersArt from "./OrdersArt";
import SettingsArt from "./SettingsArt";
import CartArt from "./CartArt";
import WishlistArt from "./WishlistArt";
import CheckoutArt from "./CheckoutArt";
import FinanceArt from "./FinanceArt";
import AlertsArt from "./AlertsArt";
import ProfileArt from "./ProfileArt";
import ReviewsArt from "./ReviewsArt";
import BlockedArt from "./BlockedArt";
import NotFoundArt from "./NotFoundArt";
import ErrorArt from "./ErrorArt";
import NoProductsArt from "./NoProductsArt";
import OrderFormArt from "./OrderFormArt";
import OrderSuccessArt from "./OrderSuccessArt";
import NoResultsArt from "./NoResultsArt";

/* ==========================================================================
   PageArt: show the right illustration by name, already sized for every screen.

     <PageArt name="orders" />                       a normal header picture
     <PageArt name="orders" size="sm" />             smaller, for tight headers
     <PageArt name="cart" className="hidden sm:block" />   hide it on phones

   names: overview, products, orders, settings, cart, wishlist, checkout, finance,
          alerts, profile, reviews, blocked, notFound, error, noResults, noProducts,
          orderForm, orderSuccess
   ========================================================================== */

const ARTS = {
  overview: OverviewArt,
  products: ProductsArt,
  orders: OrdersArt,
  settings: SettingsArt,
  cart: CartArt,
  wishlist: WishlistArt,
  checkout: CheckoutArt,
  finance: FinanceArt,
  alerts: AlertsArt,
  profile: ProfileArt,
  reviews: ReviewsArt,
  blocked: BlockedArt,
  notFound: NotFoundArt,
  error: ErrorArt,
  noProducts: NoProductsArt,
  orderForm: OrderFormArt,
  orderSuccess: OrderSuccessArt,
  noResults: NoResultsArt,
};

// Width on phone, then tablet (sm), then desktop (lg). The height follows by itself.
export const PAGE_ART_SIZES = {
  sm: "w-24 sm:w-32 lg:w-40",
  md: "w-32 sm:w-44 lg:w-60",
  lg: "w-48 sm:w-72 lg:w-96",
  hero: "w-56 sm:w-80 lg:w-[28rem]",
};

export default function PageArt({ name, size = "md", className = "", decorative = true }) {
  const Art = ARTS[name];
  if (!Art) return null;
  return <Art className={`${PAGE_ART_SIZES[size] ?? PAGE_ART_SIZES.md} ${className}`} decorative={decorative} />;
}