// add delayed functionality here

// Google Tag Manager (RYVR); GA4, Google Ads, Meta and Bing tags are managed inside it
const GTM_ID = 'GTM-P3Q4R2XM';

function loadGtm() {
  if (window.location.hostname.includes('localhost')) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  // the page's own nonce (the server replaces "aem" per request); GTM passes it on to its tags
  script.nonce = document.querySelector('script[nonce]')?.nonce || 'aem';
  document.head.append(script);
}

loadGtm();
