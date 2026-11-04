import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
	ArrowLeft,
	Clock3,
	Heart,
	Info,
	MapPin,
	Minus,
	Plus,
	ShieldCheck,
	ShoppingBag,
	Sparkles,
	Users,
	X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Image } from '@/components/ui/Image';
import { Rating } from '@/components/ui/Rating';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { productCategories, productsForRestaurant } from '@/mocks/data/products';
import { restaurants } from '@/mocks/data/restaurants';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types';

const fallbackRestaurant = restaurants[0];

const sectionLinks = [
	{ id: 'menu', label: 'Menu' },
	{ id: 'about', label: 'Our story' },
	{ id: 'reviews', label: 'Reviews' },
	{ id: 'details', label: 'Hours & location' },
];

const focusableSelector =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function RestaurantSkeleton() {
	return (
		<div className="pb-20" aria-busy="true" aria-label="Loading restaurant">
			<section className="shell pt-5 sm:pt-8"><Skeleton className="h-4 w-28" /></section>
			<section className="shell grid gap-8 pb-10 pt-8 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-16 lg:pb-16 lg:pt-12"><div><Skeleton className="h-6 w-40" /><Skeleton className="mt-5 h-12 w-3/4" /><Skeleton className="mt-4 h-4 w-full max-w-lg" /><Skeleton className="mt-2 h-4 w-2/3 max-w-lg" /><div className="mt-7 flex gap-3"><Skeleton className="h-11 w-36 rounded-full" /><Skeleton className="h-11 w-24 rounded-full" /></div></div><Skeleton className="aspect-[4/3] w-full rounded-[999px_999px_1.25rem_1.25rem]" /></section>
			<div className="border-y border-olive-900/10"><div className="shell flex gap-7 py-4"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div></div>
			<main className="shell grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14"><div><Skeleton className="h-9 w-48" />{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex gap-4 border-b border-olive-900/10 py-5"><Skeleton className="h-24 w-24 shrink-0 rounded-xl" /><div className="flex-1"><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-2 h-3 w-2/3" /><Skeleton className="mt-4 h-8 w-16 rounded-full" /></div></div>)}</div><div className="space-y-5"><Skeleton className="h-48 w-full rounded-panel" /><Skeleton className="h-56 w-full rounded-panel" /></div></main>
		</div>
	);
}

interface DishDialogProps {
	product: Product;
	restaurantName: string;
	deliveryFee: number;
	onClose: () => void;
}

function DishDialog({ product, restaurantName, deliveryFee, onClose }: DishDialogProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const closeTimerRef = useRef<number | null>(null);
	const isClosingRef = useRef(false);
	const onCloseRef = useRef(onClose);
	const titleId = useId();
	const [isClosing, setIsClosing] = useState(false);
	const addProduct = useCartStore((state) => state.addProduct);
	onCloseRef.current = onClose;

	const requestClose = useCallback(() => {
		if (isClosingRef.current) return;
		isClosingRef.current = true;
		setIsClosing(true);
		closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 300);
	}, []);

	useEffect(() => {
		const body = document.body;
		const previousOverflow = body.style.overflow;
		const previousPaddingRight = body.style.paddingRight;
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 30);

		body.style.overflow = 'hidden';
		if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				requestClose();
				return;
			}

			if (event.key !== 'Tab' || !panelRef.current) return;
			const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
				(element) => element.offsetParent !== null,
			);
			if (!focusable.length) return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			window.clearTimeout(focusTimer);
			document.removeEventListener('keydown', handleKeyDown);
			body.style.overflow = previousOverflow;
			body.style.paddingRight = previousPaddingRight;
			if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
			if (previouslyFocused?.isConnected) previouslyFocused.focus();
		};
	}, [requestClose]);

	const handleOrder = () => {
		const selectedOptions = product.optionGroups.flatMap((group) => {
			const option = group.options.find((item) => item.isDefault) ?? group.options[0];
			return option
				? [{ groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, priceDelta: option.priceDelta }]
				: [];
		});

		addProduct({ product, restaurantName, deliveryFee, selectedOptions });
		requestClose();
	};

	return (
		<div className="fixed inset-0 z-[80] overflow-y-auto p-3 sm:p-6">
			<div aria-hidden="true" className={`fixed inset-0 bg-ink/60 backdrop-blur-[10px] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={requestClose} />
			<div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`relative mx-auto mt-3 grid max-w-2xl overflow-hidden rounded-panel border border-olive-900/10 bg-ivory shadow-lift sm:mt-[7vh] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${isClosing ? 'animate-dialog-out' : 'animate-chip-in'}`}>
				<div className="relative h-52 bg-ivory-200 sm:h-auto sm:min-h-[32rem]"><Image imageKey={product.imageKey} alt={product.name} priority sizes="(min-width: 640px) 22rem, 100vw" /><div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/45 to-transparent sm:inset-y-0 sm:right-0 sm:left-auto sm:h-auto sm:w-24 sm:bg-gradient-to-l" /><button ref={closeButtonRef} type="button" onClick={requestClose} aria-label="Close dish details" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-cream/60 bg-ink/35 text-cream backdrop-blur-md transition hover:bg-ink/55"><X aria-hidden="true" className="h-5 w-5" /></button></div>
				<div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow text-terracotta-700">From the kitchen</p><h2 id={titleId} className="mt-3 text-display-sm">{product.name}</h2></div><span className="shrink-0 text-lg font-semibold tabular-nums text-olive-900">{formatCurrency(product.price)}</span></div><p className="mt-4 text-sm leading-7 text-olive-600">{product.description}</p><div className="mt-5 flex flex-wrap gap-2">{product.isVegetarian ? <Badge tone="success">Vegetarian</Badge> : null}{product.isSpicy ? <Badge tone="terracotta">Spicy</Badge> : null}{product.isPopular ? <Badge tone="gold">Popular</Badge> : null}{product.calories ? <Badge tone="outline">{product.calories} calories</Badge> : null}</div>{product.optionGroups.length ? <div className="mt-6 border-t border-olive-900/10 pt-5"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive-500">Included choices</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{product.optionGroups.map((group) => <div key={group.id} className="rounded-xl bg-cream p-3"><p className="text-xs font-semibold text-olive-900">{group.name}</p><p className="mt-1 text-xs leading-5 text-olive-500">{group.options.find((option) => option.isDefault)?.name ?? group.options[0]?.name ?? 'Chef selected'}</p></div>)}</div></div> : null}<div className="mt-7 flex flex-col-reverse gap-3 border-t border-olive-900/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-olive-500">Ready in {product.available ? 'the current menu' : 'the next menu update'}.</p><Button onClick={handleOrder} iconLeft={<ShoppingBag className="h-4 w-4" />}>Add to order</Button></div></div>
			</div>
		</div>
	);
}

function MenuItem({ product, restaurantName, deliveryFee, onSelect }: { product: Product; restaurantName: string; deliveryFee: number; onSelect: (product: Product) => void }) {
	const cartItem = useCartStore((state) => state.items.find((item) => item.productId === product.id));
	const quantity = cartItem?.quantity ?? 0;
	const addProduct = useCartStore((state) => state.addProduct);
	const updateQuantity = useCartStore((state) => state.updateQuantity);

	const add = () => {
		if (cartItem) {
			updateQuantity(cartItem.id, quantity + 1);
		} else {
			addProduct({ product, restaurantName, deliveryFee });
		}
	};

	return (
		<article className="group flex cursor-pointer gap-4 border-b border-olive-900/10 py-5 last:border-0 sm:gap-5" onClick={(event) => { if (!(event.target as HTMLElement).closest('button')) onSelect(product); }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); onSelect(product); } }} role="button" tabIndex={0} aria-label={`View details for ${product.name}`}>
			<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ivory-200 sm:h-24 sm:w-24">
				<Image imageKey={product.imageKey} alt={product.name} sizes="96px" className="transition duration-700 group-hover:scale-105" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h3 className="text-[1.05rem] leading-tight">{product.name}</h3>
						<p className="mt-1 max-w-xl text-xs leading-relaxed text-olive-500 sm:text-[0.8125rem]">{product.description}</p>
					</div>
					<span className="shrink-0 text-sm font-semibold tabular-nums text-olive-800">{formatCurrency(product.price)}</span>
				</div>
				<div className="mt-3 flex items-center justify-between gap-3">
					<div className="flex flex-wrap gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-olive-500">
						{product.isVegetarian ? <span>Vegetarian</span> : null}
						{product.isSpicy ? <span>Spicy</span> : null}
						{product.isPopular ? <span className="text-terracotta-700">Popular</span> : null}
					</div>
					{quantity ? (
						<div className="flex h-8 items-center gap-2 rounded-full border border-olive-900/15 bg-cream px-1 text-sm">
							  <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => cartItem && updateQuantity(cartItem.id, quantity - 1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-ivory-200"><Minus className="h-3 w-3" /></button>
							<span className="min-w-4 text-center text-xs font-semibold">{quantity}</span>
							<button type="button" aria-label={`Add another ${product.name}`} onClick={add} className="grid h-6 w-6 place-items-center rounded-full hover:bg-ivory-200"><Plus className="h-3 w-3" /></button>
						</div>
					) : (
						<button type="button" onClick={add} className="inline-flex h-8 items-center gap-1 rounded-full border border-olive-900/15 bg-cream px-3 text-xs font-semibold text-olive-800 transition hover:border-terracotta-600 hover:text-terracotta-700">
							<Plus className="h-3.5 w-3.5" /> Add
						</button>
					)}
				</div>
			</div>
		</article>
	);
}

export default function RestaurantPage() {
	const { restaurantName } = useParams<{ restaurantName: string }>();
	const [activeGroup, setActiveGroup] = useState('');
	const [activeSection, setActiveSection] = useState('menu');
	const [saved, setSaved] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const restaurant = restaurants.find((item) => item.slug === restaurantName) ?? fallbackRestaurant;
	const restaurantProducts = useMemo(() => productsForRestaurant(restaurant.id), [restaurant.id]);
	const menuGroups = useMemo(
		() => productCategories.filter((category) => category.restaurantId === restaurant.id),
		[restaurant.id],
	);
	const hasUnknownRestaurant = restaurantName !== undefined && !restaurants.some((item) => item.slug === restaurantName);

	useEffect(() => {
		setIsLoading(true);
		const timer = window.setTimeout(() => setIsLoading(false), 350);
		return () => window.clearTimeout(timer);
	}, [restaurantName]);

	useEffect(() => {
		if (!menuGroups.some((group) => group.id === activeGroup)) {
			setActiveGroup(menuGroups[0]?.id ?? '');
		}
	}, [activeGroup, menuGroups]);

	useEffect(() => {
		const updateActiveSection = () => {
			const hashSection = window.location.hash.slice(1);
			if (sectionLinks.some((section) => section.id === hashSection)) {
				setActiveSection(hashSection);
			}

			const currentSection = sectionLinks.reduce((active, section) => {
				const element = document.getElementById(section.id);
				return element && element.getBoundingClientRect().top <= 180 ? section.id : active;
			}, 'menu');
			setActiveSection(currentSection);
		};

		updateActiveSection();
		window.addEventListener('hashchange', updateActiveSection);
		window.addEventListener('scroll', updateActiveSection, { passive: true });
		return () => {
			window.removeEventListener('hashchange', updateActiveSection);
			window.removeEventListener('scroll', updateActiveSection);
		};
	}, []);

	if (isLoading) return <RestaurantSkeleton />;

	return (
		<div className="pb-20">
			<section className="shell pt-5 sm:pt-8">
				<Link to={ROUTES.home} className="link-underline text-xs text-olive-500"><ArrowLeft className="h-3.5 w-3.5" /> All restaurants</Link>
				{hasUnknownRestaurant ? <p className="mt-3 text-xs text-olive-500">That restaurant is not in this demo, so here is Savora&apos;s featured kitchen.</p> : null}
			</section>

			<section className="shell grid gap-8 pb-10 pt-8 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:gap-16 lg:pb-16 lg:pt-12">
				<Reveal>
					<div className="max-w-xl">
						<div className="flex flex-wrap gap-2">{restaurant.badges.map((badge) => <Badge key={badge} tone={badge === 'Savora pick' ? 'gold' : badge === 'Offer' ? 'terracotta' : 'cream'} icon={badge === 'Savora pick' ? <Sparkles className="h-3 w-3" /> : undefined}>{badge}</Badge>)}<Badge tone={restaurant.isOpen ? 'success' : 'outline'}>{restaurant.isOpen ? 'Open now' : 'Closed'}</Badge></div>
						<h1 className="mt-5 text-display-md sm:text-display-lg">{restaurant.name}</h1>
						<p className="mt-3 max-w-lg text-sm leading-7 text-olive-600 sm:text-base">{restaurant.tagline}</p>
						<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-olive-500"><Rating rating={restaurant.rating} reviewCount={restaurant.reviewCount} /><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {restaurant.estimatedDeliveryMinutes[0]}–{restaurant.estimatedDeliveryMinutes[1]} min</span><span>{restaurant.distanceKm} km</span><span>{'$'.repeat(restaurant.priceLevel)} · {restaurant.cuisines[0]}</span></div>
						<div className="mt-7 flex flex-wrap gap-3"><Button iconLeft={<ShoppingBag className="h-4 w-4" />} onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}>Start an order</Button><Button variant="outline" iconLeft={<Heart className={cn('h-4 w-4', saved && 'fill-terracotta-600 text-terracotta-600')} />} onClick={() => setSaved((value) => !value)}>{saved ? 'Saved' : 'Save'}</Button><Button variant="ghost" iconLeft={<Info className="h-4 w-4" />} onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>Details</Button></div>
						{restaurant.offerLabel ? <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-olive-600"><Sparkles className="h-3.5 w-3.5 text-success" /> {restaurant.offerLabel}</div> : null}
					</div>
				</Reveal>
				<Reveal delay={120} className="relative"><div className="arch-frame aspect-[4/3] overflow-hidden border-4 border-cream bg-ivory-200 shadow-lift"><Image imageKey={restaurant.imageKey} alt={`${restaurant.name} dining room`} priority sizes="(min-width: 1024px) 52vw, 100vw" className="transition duration-1000 hover:scale-105" /></div><div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-cream px-3 py-2 text-[0.6875rem] font-medium text-olive-800 shadow-soft"><MapPin className="h-3.5 w-3.5 text-terracotta-600" /> {restaurant.address.city}, {restaurant.address.state}</div></Reveal>
			</section>

			<nav className="sticky top-[4.75rem] z-30 border-y border-olive-900/10 bg-ivory/90 backdrop-blur-md" aria-label="Restaurant sections"><div className="shell flex gap-7 overflow-x-auto">{sectionLinks.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => setActiveSection(section.id)} className={cn('border-b-2 py-4 text-xs transition-colors', activeSection === section.id ? 'border-terracotta-600 font-semibold text-olive-900' : 'border-transparent font-medium text-olive-500 hover:text-olive-900')}>{section.label}</a>)}</div></nav>

			<main id="menu" className="shell grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
				<div>
					<div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-olive-900/10 pb-3">{menuGroups.map((group) => <button key={group.id} type="button" onClick={() => setActiveGroup(group.id)} className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition', activeGroup === group.id ? 'bg-olive-700 text-cream' : 'text-olive-500 hover:bg-cream hover:text-olive-900')}>{group.name}</button>)}</div>
					{menuGroups.map((group) => {
						const groupProducts = restaurantProducts.filter((product) => product.categoryId === group.id);
						if (!groupProducts.length || (activeGroup !== group.id && activeGroup !== 'all')) return null;
						return <Reveal key={group.id} className="scroll-mt-32" delay={80}><section className="pt-7"><div className="flex items-end justify-between"><div><h2 className="text-display-sm">{group.name}</h2><p className="mt-1 text-xs text-olive-500">{group.description} · {groupProducts.length} {groupProducts.length === 1 ? 'dish' : 'dishes'}</p></div><span className="hidden text-xs text-olive-400 sm:block">Vegetarian options marked</span></div>{groupProducts.map((product) => <MenuItem key={product.id} product={product} restaurantName={restaurant.name} deliveryFee={restaurant.deliveryFee} onSelect={setSelectedProduct} />)}</section></Reveal>;
					})}
				</div>
				<aside className="lg:sticky lg:top-[8.5rem] lg:self-start">
					<section id="about" className="mt-5 rounded-panel border border-olive-900/10 bg-cream p-5"><h3 className="text-xl">About this kitchen</h3><p className="mt-2 text-xs leading-6 text-olive-500">{restaurant.name} is a neighbourhood kitchen built around seasonal produce, good company and food that travels well.</p><div className="mt-4 space-y-2 border-t border-olive-900/10 pt-4 text-xs"><div className="flex justify-between"><span className="text-olive-500">Price range</span><span>{'$'.repeat(restaurant.priceLevel)} · Moderate</span></div><div className="flex justify-between"><span className="text-olive-500">Dietary</span><span>Vegetarian options</span></div><div className="flex gap-2 pt-2 text-olive-500"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Contactless delivery available</div></div></section>
					<section id="details" className="mt-5 rounded-panel border border-olive-900/10 bg-cream p-5"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-terracotta-700">Visit the kitchen</p><h3 className="mt-3 text-xl">Hours & location</h3></div><MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-terracotta-600" /></div><div className="mt-5 grid gap-5 border-t border-olive-900/10 pt-5 sm:grid-cols-2 lg:grid-cols-1"><div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive-500">Opening hours</p><dl className="mt-3 space-y-2 text-xs">{restaurant.openingHours.map((hours) => <div key={hours.day} className="flex justify-between gap-4"><dt className="text-olive-500">{hours.day}</dt><dd className="font-medium text-olive-800">{hours.open === 'Closed' ? 'Closed' : `${hours.open} – ${hours.close}`}</dd></div>)}</dl></div><div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive-500">Delivery address</p><address className="mt-3 not-italic text-xs leading-6 text-olive-600">{restaurant.address.line1}<br />{restaurant.address.city}, {restaurant.address.state} {restaurant.address.postalCode}</address><p className="mt-3 text-xs text-success">{restaurant.isOpen ? 'Open now for delivery' : 'Currently closed'}</p></div></div></section>
				</aside>
			</main>

			<section id="reviews" className="shell pt-16"><SectionHeading eyebrow="The table talk" title="What people say" description={`${restaurant.reviewCount.toLocaleString()} reviews · ${restaurant.rating} average`} /><div className="mt-7 grid gap-4 sm:grid-cols-2"><Reveal><div className="rounded-card border border-olive-900/10 bg-cream p-5"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive-500">Aggregate rating</p><div className="mt-4 flex items-center gap-3"><Rating rating={restaurant.rating} showReviews={false} /><span className="font-display text-3xl font-normal text-olive-900">{restaurant.rating}</span></div><p className="mt-3 text-sm leading-6 text-olive-600">The restaurant mock provides an aggregate rating rather than individual review text.</p></div></Reveal><Reveal delay={100}><div className="rounded-card border border-olive-900/10 bg-cream p-5"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive-500">Reviews recorded</p><p className="mt-3 font-display text-3xl font-normal text-olive-900">{restaurant.reviewCount.toLocaleString()}</p><p className="mt-3 text-sm leading-6 text-olive-600">Review count from the selected restaurant&apos;s mock record.</p></div></Reveal></div></section>
			<div className="shell mt-16"><div className="flex items-center gap-3 border-t border-olive-900/10 pt-5 text-xs text-olive-500"><Users className="h-4 w-4 text-terracotta-600" /> A neighbourhood favourite, delivered with care.</div></div>
			{selectedProduct ? <DishDialog product={selectedProduct} restaurantName={restaurant.name} deliveryFee={restaurant.deliveryFee} onClose={() => setSelectedProduct(null)} /> : null}
		</div>
	);
}
