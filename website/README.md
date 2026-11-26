# Ronak By Ali

Ronak By Ali is an online storefront for ready-made and customizable products. It
brings product discovery, personalization, ordering, and customer account tools
together in one place.

## Brand and visual theme

The visual identity takes inspiration from the materials behind the products:
indigo denim, ecru fabric, washed-blue accents, and small tan details reminiscent
of top-stitching. The result is a calm, product-focused shopping experience
rather than a crowded catalogue.

The interface supports light and dark themes, adapts to mobile and desktop
screens, and uses product photography and subtle motion to guide attention.
Headings use Barlow Condensed and Space Grotesk, balanced with Inter for
readable interface text.

## How the app works

### For shoppers

1. Explore the home page and browse the product catalogue.
2. Open a product to review its details, available options, and any current
   offer.
3. Add ready-made products to the cart, save items to a wishlist, or use the
   Custom Studio to request a personalized product.
4. Sign in or create an account, provide delivery details, and place the order.
5. Return to the account area to review orders and use related customer tools.

Product information, offers, and account data are loaded from the connected
Appwrite project. The storefront also includes contact and help pages for
questions about shopping and custom orders.

### For the store team

Authorized staff use a separate dashboard to oversee the shop. Depending on
their access, they can manage products and inventory, review orders and
customers, and work with reviews, alerts, team settings, and finance information.

## Technology

- React and Vite power the web application.
- Appwrite provides authentication, data storage, file storage, and server-side
  functions.
- The interface uses Tailwind CSS, with shared application state managed by
  Redux Toolkit.

## Run locally

1. Install Node.js and npm.
2. From this directory, install dependencies:

   ```sh
   npm install
   ```

3. Copy `.env.sample` to `.env` and add the Appwrite project configuration.
   The Appwrite project must also have the collections, storage, permissions,
   authentication providers, and functions required by the app configured.
4. Start the development server:

   ```sh
   npm run dev
   ```

To create and preview a production build:

```sh
npm run build
npm run preview
```
