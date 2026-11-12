const questions = [
  {
    question: 'How do I browse the products?',
    answer: 'Open Shop from the header to browse products, search, and refine the list with filters.',
  },
  {
    question: 'Where can I see my orders?',
    answer: 'Sign in and open your account to find your orders and other account details.',
  },
  {
    question: 'How do I get help with an order?',
    answer: 'Use the Contact page and include your order details so we can help you.',
  },
  {
    question: 'Where can I read about my data?',
    answer: 'Visit the Privacy page for information about privacy.',
  },
];

export default function FAQs() {
  return (
    <article className="mx-auto max-w-3xl py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Help center</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted">Quick answers to common questions about shopping and your account.</p>
      </header>

      <dl className="divide-y divide-border rounded-2xl border border-border bg-surface px-5 sm:px-7">
        {questions.map(({ question, answer }) => (
          <div key={question} className="py-5">
            <dt className="font-semibold text-text">{question}</dt>
            <dd className="mt-2 text-sm leading-6 text-muted">{answer}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
