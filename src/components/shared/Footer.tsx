import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';
import { footerNav } from '@/config/navigation';
import { site } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

const socialIcons = [Instagram, Youtube, Twitter];

export function Footer() {
  const notify = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!valid) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setSubscribed(true);
    notify({
      tone: 'success',
      title: 'You are on the list',
      description: 'A short letter about new kitchens, every other Thursday.',
    });
  };

  return (
    <footer id="support" className="surface-grain relative overflow-hidden bg-olive-800 text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full border border-cream/8"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-olive-700/30 blur-3xl"
      />

      <div className="shell relative z-10">
        {/* Newsletter */}
        <div className="grid gap-8 border-b border-cream/10 py-14 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-20">
          <div>
            <p className="eyebrow mb-4 text-gold-200">The Savora letter</p>
            <h2 className="max-w-lg text-[clamp(2rem,3.4vw,3rem)] leading-[1.05] text-cream">
              New kitchens, seasonal menus, <em className="italic text-gold-200">good ideas.</em>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/55">
              A short note every other Thursday. No offers you did not ask for, no noise. Unsubscribe in one click.
            </p>
          </div>

          <div>
            {subscribed ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-2xl border border-cream/15 bg-cream/5 p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-300 text-olive-900">
                  <Check aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-cream">You are on the list.</p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-cream/55">
                    We sent a confirmation to {email}. You can unsubscribe any time.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={subscribe} noValidate>
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <div className="flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 p-1.5 transition focus-within:border-gold-300/60 focus-within:bg-cream/10">
                  <Mail aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-cream/40" />
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'newsletter-error' : undefined}
                    className="h-9 min-w-0 flex-1 bg-transparent text-sm text-cream placeholder:text-cream/35 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-gold-300 px-4 text-[0.8125rem] font-medium text-olive-900 transition hover:bg-gold-200"
                  >
                    Join
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
                {error ? (
                  <p id="newsletter-error" className="mt-2 pl-4 text-xs text-gold-200">
                    {error}
                  </p>
                ) : (
                  <p className="mt-2 pl-4 text-[0.6875rem] text-cream/35">
                    Demo form — no emails are stored or sent.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 lg:grid-cols-6 lg:gap-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 lg:pr-8">
            <Link to="/" aria-label="Savora home" className="inline-block">
              <Logo tone="light" />
            </Link>
            <p className="mt-5 max-w-xs text-[0.8125rem] leading-relaxed text-cream/55">
              A marketplace for independent kitchens. Discover exceptional food nearby, and enjoy every moment from
              order to doorstep.
            </p>

            <div className="mt-6 space-y-2.5 text-[0.8125rem] text-cream/60">
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 transition hover:text-cream">
                <Mail aria-hidden="true" className="h-3.5 w-3.5 text-gold-300/80" />
                {site.email}
              </a>
              <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 transition hover:text-cream">
                <Phone aria-hidden="true" className="h-3.5 w-3.5 text-gold-300/80" />
                {site.phone}
              </a>
              <p className="flex items-start gap-2.5">
                <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300/80" />
                {site.address}
              </p>
            </div>
          </div>

          <FooterColumn title="Discover" items={footerNav.discover} />
          <FooterColumn title="Account" items={footerNav.account} />
          <FooterColumn title="Partners" items={footerNav.partners} />
          <FooterColumn title="Support" items={footerNav.support} />
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-5 border-t border-cream/10 py-7 text-[0.6875rem] text-cream/40 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} Savora. Made with care in Brooklyn, NY.</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {['Privacy', 'Terms', 'Cookies', 'Licences'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  notify({
                    tone: 'info',
                    title: `${label} policy`,
                    description: 'This legal page is part of the launch checklist and is not included in the prototype.',
                  })
                }
                className="text-cream/40 underline-offset-4 transition hover:text-cream/80 hover:underline"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-1 text-cream/30">Follow</span>
            {site.social.map((social, index) => {
              const Icon = socialIcons[index] ?? Instagram;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/12 text-cream/55 transition hover:border-gold-300/50 hover:text-gold-200"
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; to: string; soon?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-gold-200/80">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              title={item.soon ? 'Part of the next module' : undefined}
              className={cn(
                'group inline-flex items-center gap-1.5 text-[0.8125rem] text-cream/55 transition hover:text-cream',
              )}
            >
              {item.label}
              {item.soon ? <span className="h-1 w-1 rounded-full bg-gold-300/50" aria-hidden="true" /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
