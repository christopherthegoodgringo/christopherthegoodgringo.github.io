/* Business owner portal settings. These two values are public by design:
   Supabase's publishable key only allows what the database security rules permit. */
window.CGG_PORTAL = {
  supabaseUrl: 'https://dhkyyhbfybbxczveyvfw.supabase.co',
  supabaseKey: 'sb_publishable_1gTur2LlYvXmRBPWW4D2HQ_TcgRM7c9',
  // Where listings of each type live, and the key that holds the list.
  sources: {
    hotels: [['/data/hotels.json', 'hotels']],
    hostels: [['/data/paid-listings.json', 'hostels'], ['/data/hostels-clean.json', 'hostels']],
    restaurants: [['/data/restaurants.json', 'restaurants']],
    bars: [['/data/bars.json', 'bars']],
    'street-food': [['/data/street-food.json', 'streetFood']]
  },
  typeLabels: { hotels: 'Hotel', hostels: 'Hostel', restaurants: 'Restaurant', bars: 'Bar', 'street-food': 'Street Food' },
  // Fields owners may change. The database enforces the same list.
  editableFields: ['description', 'address', 'phone', 'email', 'website', 'whatsapp', 'hours', 'priceRange', 'cuisine', 'drinks', 'features', 'photo'],
  // Which payment system the owner portal and the ebooks page use: 'paypal' or 'stripe'.
  // Stripe stays on until PayPal is tested. To test PayPal on one device first, run in the browser console:
  //   localStorage.setItem('gg-pay-test', 'paypal')   (remove it with localStorage.removeItem('gg-pay-test'))
  payments: (function () { try { if (localStorage.getItem('gg-pay-test') === 'paypal') return 'paypal'; } catch (e) {} return 'stripe'; })(),
  // Payment links per tier. Leave empty until Stripe is set up.
  // Paid upgrades go live automatically through the "stripe-webhook" Supabase function.
  // LIVE links (real payments, cards only).
  stripeLinks: {
    silver: 'https://buy.stripe.com/7sY9AUa6z3xjdQeaVE3oA00',
    gold: 'https://buy.stripe.com/4gM3cwguX6JveUifbU3oA01',
    platinum: 'https://buy.stripe.com/14A5kE92vd7T13s3tc3oA02'
  },
  // Stripe customer portal login link (Settings > Billing > Customer portal), for owners
  // to update their card or cancel. Leave empty to hide the link.
  stripeManageLink: 'https://billing.stripe.com/p/login/7sY9AUa6z3xjdQeaVE3oA00'
};
