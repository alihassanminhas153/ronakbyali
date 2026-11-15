import Faqs from "../../components/home/Faqs";
import { ALL_FAQS } from "../../components/home/faqData";
import Footer from "../../components/home/Footer";

/* FAQs page: the same chat-style list and animated cat as the home page, with every question.
   Edit the questions in src/components/home/faqData.js. */
export default function FAQs() {
  return (
    <main>
      <Faqs items={ALL_FAQS} as="h1" />
      <Footer />
    </main>
  );
}