import Link from 'next/link';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { title: 'Artists', href: '/artists' },
      { title: 'Shows', href: '/shows' },
      { title: 'Venues', href: '/venues' },
      { title: 'Setlists', href: '/setlists' },
    ],
    company: [
      { title: 'About', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Privacy', href: '/privacy' },
      { title: 'Terms', href: '/terms' },
    ],
    social: [
      { title: 'Twitter', href: 'https://twitter.com' },
      { title: 'Instagram', href: 'https://instagram.com' },
      { title: 'Facebook', href: 'https://facebook.com' },
    ],
  };

  return (
    <footer className="border-t bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">MySetlist</h3>
            <p className="text-muted-foreground text-sm">
              Vote for your dream setlist and connect with fellow music fans.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-medium">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-medium">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-medium">Connect</h4>
            <ul className="space-y-2">
              {footerLinks.social.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-center text-muted-foreground text-sm">
            © {currentYear} MySetlist. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
