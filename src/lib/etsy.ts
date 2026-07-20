export type UtmCampaign =
  | 'home'
  | 'category_hunting'
  | 'category_fishing'
  | 'category_outdoor'
  | 'category_patriotic'
  | 'product_page'
  | 'gift_guide'
  | 'footer';

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
  category: 'hunting' | 'fishing' | 'outdoor' | 'patriotic',
): UtmCampaign {
  return `category_${category}` as UtmCampaign;
}
