import { useParams } from "react-router-dom";

// Use this inside Product.jsx. It works for both product URLs:
//   /products/:category/:group/:productId   -> params.productId
//   /:productId (short link)                -> params.username (shared segment)
export default function useProductId() {
  const { productId, username } = useParams();
  return productId ?? username;
}