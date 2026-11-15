import { Link } from "react-router";
import { ArrowUpRight, MessageCircle } from "lucide-react";

import CustomStudio from "../../components/home/CustomStudio";
import OrderPath from "../../components/home/OrderPath";
import Footer from "../../components/home/Footer";
import { PATHS } from "../../router/path";
import { WHATSAPP_URL } from "../../lib/siteInfo";

/* Custom studio page: the animated "custom order being made" drawing, the order path under it,
   and two buttons to start. Route: /custom-studio */
const btn =
  "inline-flex items-center gap-2 rounded-full px-5 py-3 font-heading text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:text-base";

export default function CustomStudioPage() {
  return (
    <main>
      <h1 className="sr-only">Custom designs</h1>
      <CustomStudio />
      <OrderPath />

      <section
        aria-labelledby="studio-cta"
        className="mx-auto flex w-full max-w-[90rem] flex-col items-start gap-5 px-4 py-14 sm:px-6 sm:py-20"
      >
        <h2
          id="studio-cta"
          className="font-display text-4xl leading-[0.9] font-bold tracking-[0.01em] text-text uppercase sm:text-6xl lg:text-7xl"
        >
          Start yours
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to={PATHS.products} className={`${btn} bg-accent text-on-accent hover:opacity-90`}>
            Browse the shop
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} border border-border bg-surface text-text hover:border-accent`}
          >
            <MessageCircle size={18} aria-hidden="true" />
            Message us
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}