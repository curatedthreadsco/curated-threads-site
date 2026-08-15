export type UtmCampaign =
  | 'home'
  | 'category_hunting'
  | 'category_fishing'
  | 'category_patriotic'
  | 'product_page'
  | 'gift_guide'
  | 'footer'
  | 'meta_checkout';

const SHOP_URL = 'https://curatedthreadsllc.etsy.com/';

export function shopWithUtm(campaign: UtmCampaign): string {
  const params = new URLSearchParams({
    utm_source: 'curatedthreadsllc',
    utm_medium: 'web',
    utm_campaign: campaign,
  });
  return `${SHOP_URL}?${params.toString()}`;
}

export function etsyLink(opts: {
  listingUrl?: string;
  campaign: UtmCampaign;
  productSlug?: string;
}): string {
  const { listingUrl, campaign, productSlug } = opts;
  const base = listingUrl ?? SHOP_URL;
  // Strip any existing query string to avoid duplicates
  const cleanBase = base.split('?')[0];
  const params = new URLSearchParams({
    utm_source: 'curatedthreadsllc',
    utm_medium: 'web',
    utm_campaign: campaign,
  });
  if (productSlug) params.set('utm_content', productSlug);
  return `${cleanBase}?${params.toString()}`;
}

export function categoryCampaign(
  category: 'hunting' | 'fishing' | 'patriotic',
): UtmCampaign {
  return `category_${category}` as UtmCampaign;
}

// Etsy CDN URLs contain a size segment like `il_fullxfull.` between the listing
// path and the filename. Requesting `il_fullxfull` for a 400px card wastes
// bandwidth and gives some browsers softer downscales. Swap in the right variant
// for the display size instead. Valid variants: il_75x75, il_170x135, il_340x270,
// il_570xN, il_794xN, il_1140xN, il_1588xN, il_2000xN, il_fullxfull.
export type EtsyImageVariant =
  | 'il_75x75'
  | 'il_170x135'
  | 'il_340x270'
  | 'il_570xN'
  | 'il_794xN'
  | 'il_1140xN'
  | 'il_1588xN'
  | 'il_2000xN'
  | 'il_fullxfull';

const ETSY_VARIANT_RE = /il_(?:75x75|170x135|340x270|570xN|794xN|1140xN|1588xN|2000xN|fullxfull)\./;

export function etsyImage(src: string, variant: EtsyImageVariant): string {
  if (!ETSY_VARIANT_RE.test(src)) return src;
  return src.replace(ETSY_VARIANT_RE, `${variant}.`);
}

// Build a srcset for a card-sized image so retina displays get the 2x variant.
export function etsyImageSrcSet(
  src: string,
  variants: { variant: EtsyImageVariant; width: number }[],
): string {
  return variants
    .filter(() => ETSY_VARIANT_RE.test(src))
    .map(({ variant, width }) => `${etsyImage(src, variant)} ${width}w`)
    .join(', ');
}
