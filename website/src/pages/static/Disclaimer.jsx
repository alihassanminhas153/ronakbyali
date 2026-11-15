import DisclaimerArt from "../../components/static/DisclaimerArt";
import PolicyLayout from "../../components/static/PolicyLayout";
import { BRAND, EMAIL } from "../../lib/siteInfo";

/* Disclaimer page. Same layout as Privacy (shared PolicyLayout): heading and animated warning
   drawing on the left, numbered cards on the right. Edit the text in SECTIONS below.
   This is a plain-language DRAFT: please check it matches how your shop really works
   (returns, delivery times, custom orders) before you publish it. */

const UPDATED = "November 2026";

// Each section: a title, then paragraphs (strings) and/or a list (array of strings)
const SECTIONS = [
  {
    title: "Colours on your screen",
    text: [
      "Every screen shows colour a little differently, and light changes how fabric looks. Your piece may look slightly lighter or darker than the photos. If an exact shade matters, message us and we can describe it or send a close-up.",
    ],
  },
  {
    title: "Sizes and fit",
    text: [
      "Size guides are a close guide, not an exact promise. Because pieces are cut and stitched by hand, measurements can differ by up to about one inch. Please check the measurements against a piece that fits you well.",
    ],
  },
  {
    title: "Custom designs",
    text: [
      "We send a preview before we start, and it is a close picture of the result. Printing and stitching can still differ slightly in shade, size and position, so the final piece may not match the preview exactly.",
      "Once a custom piece is in production it cannot be cancelled or returned, though we will alter it if it does not fit.",
      "Please only upload designs you have the right to use. We may decline a design that copies someone else's work or is not suitable.",
    ],
  },
  {
    title: "Delivery times",
    text: [
      "Delivery dates are estimates, not guarantees. Couriers, holidays, weather and busy seasons can cause delays that are outside our control. We will keep you updated and help if a parcel is late.",
    ],
  },
  {
    title: "Prices and availability",
    text: [
      "Prices, discounts and stock can change without notice. If we make a mistake in a price or an item sells out after you order, we will contact you and offer a choice or a full refund.",
    ],
  },
  {
    title: "Looking after your clothes",
    text: [
      "Follow the care advice on the label or on our FAQs. We cannot cover damage caused by washing, drying or ironing in a different way.",
    ],
  },
  {
    title: "Information on this site",
    text: [
      "We work to keep everything on this site accurate and up to date, but mistakes can happen. Nothing here limits the rights you have under the law.",
    ],
  },
  {
    title: "Questions",
    text: [`If anything here is unclear, write to us at ${EMAIL} and we will be glad to help.`],
  },
];

export default function Disclaimer() {
  return (
    <PolicyLayout
      id="disclaimer-title"
      titleLines={["Disclaimer"]}
      Art={DisclaimerArt}
      updated={UPDATED}
      brand={BRAND}
      sections={SECTIONS}
    />
  );
}