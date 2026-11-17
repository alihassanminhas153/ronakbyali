import PrivacyArt from "../../components/static/PrivacyArt";
import PolicyLayout from "../../components/static/PolicyLayout";
import { BRAND, EMAIL } from "../../lib/siteInfo";

/* Privacy page. Left: big heading and the animated shield (sticky on large screens while you read).
   Right: the policy as numbered cards. Edit the text in SECTIONS below.
   This is a plain-language DRAFT: please check it matches what your shop really does
   (payments, cookies, who delivers) before you publish it. */

const UPDATED = "November 2026";

// Each section: a title, then paragraphs (strings) and/or a list (array of strings)
const SECTIONS = [
  {
    title: "What we collect",
    text: ["We only ask for what we need to take and deliver your order:"],
    list: [
      "Account details: your name, email address and phone number, including when you sign in with Google.",
      "Delivery details: your address and city.",
      "Order details: what you ordered, sizes, colours, notes and the order status.",
      "Custom designs: the pictures and notes you upload for custom pieces.",
      "Your cart, wishlist and any reviews you choose to write.",
    ],
  },
  {
    title: "How we use it",
    text: [
      "We use your details to make, pack and deliver your order, and to contact you by phone, email or WhatsApp to confirm your order and share updates. Please enter a current phone number, email address and other contact details so we can reach you; incorrect or incomplete details may delay order confirmation or delivery.",
      "We do not sell your personal information.",
    ],
  },
  {
    title: "Custom design files",
    text: [
      "Files you upload are used only to make your order. We do not publish or reuse them without asking you first, and we delete them when you ask.",
      "Please only upload designs you have the right to use.",
    ],
  },
  {
    title: "Who we share it with",
    text: ["We share only what is needed, and only with the people who help us serve you:"],
    list: [
      "Delivery partners, who get your name, phone number and address.",
      "Payment providers, if you pay online.",
      "The services that host our website and database.",
    ],
  },
  {
    title: "Cookies and saved settings",
    text: [
      "Your browser keeps small bits of data so you stay signed in and the site remembers things like light or dark mode and your unfinished checkout. We do not use them to show you ads.",
    ],
  },
  {
    title: "Your choices",
    text: [
      "You can see and update your details on your profile page. You can also ask us for a copy of your data, or to delete it, and you can stop messages from us at any time. Just write to us.",
    ],
  },
  {
    title: "Security",
    text: [
      "We limit who can see your information and keep it with trusted services. No website can promise perfect security, so please use a strong password and keep it private.",
    ],
  },
  {
    title: "Children",
    text: ["Our shop is not meant for children under 13. If a child has sent us details, a parent or guardian can ask us to remove them."],
  },
  {
    title: "Changes and contact",
    text: [
      `If we change this page we will update the date above. Questions about your privacy are welcome at ${EMAIL}.`,
    ],
  },
];

export default function Privacy() {
  return (
    <PolicyLayout
      id="privacy-title"
      titleLines={["Privacy", "policy"]}
      Art={PrivacyArt}
      updated={UPDATED}
      brand={BRAND}
      sections={SECTIONS}
    />
  );
}