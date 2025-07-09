import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/design-system/components/ui/accordion';
import React from 'react';

const faqs = [
  {
    question: 'How do I vote on setlists?',
    answer:
      "After creating an account, you can browse upcoming shows and vote on which songs you'd like to hear. Your votes help artists understand fan preferences for their setlists.",
  },
  {
    question: 'Can I track artists I discover on Spotify?',
    answer:
      'Yes! Our Spotify integration lets you discover new artists and automatically track their concert announcements and setlist updates.',
  },
  {
    question: 'How accurate are the setlist predictions?',
    answer:
      'Our setlist predictions are based on fan votes, historical data, and real-time updates from shows. While not guaranteed, they give you a great idea of what to expect.',
  },
  {
    question: 'Do I get notified about new shows?',
    answer:
      "Absolutely! You'll receive notifications when artists you follow announce new shows in your area or when setlist voting opens for upcoming concerts.",
  },
];

export default function FAQ() {
  return (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-regular text-3xl tracking-tighter md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed tracking-tight">
            Everything you need to know about MySetlist
          </p>
        </div>
        <div className="mx-w-full max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  </div>
  );
}
