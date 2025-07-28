import { getDictionary } from "@repo/internationalization";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ContactForm } from "./components/contact-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const dictionary = await getDictionary("en"); // Default to English
  return createMetadata(dictionary.web.contact.meta);
};

const Contact = async () => {
  const dictionary = await getDictionary("en"); // Default to English
  return <ContactForm dictionary={dictionary} />;
};

export default Contact;
