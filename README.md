# KMPL AEM content packages

- kmpl-site-content-1.10.0.zip (latest): as 1.9.0, plus lead form variants modals/apply-now-loan-against-property and modals/apply-now-car-lease, the updated standard modals/apply-now (Select loan category, Your name, title break), and product page Apply now links to their variant (23 pages).
- kmpl-site-content-1.9.0.zip: as 1.8.0, plus the Documents Required section on all product pages uses the streak artwork as section background images (shared/documents-bg-desktop.jpg, documents-bg-mobile.jpg) instead of the block decoration.
- kmpl-site-content-1.8.0.zip: the Dealer Finance intro section has background images (desktop and mobile) as section properties; 2 new images (dealer-finance/intro-bg-desktop.jpg, intro-bg-mobile.jpg).
- kmpl-site-content-1.7.0.zip: same pages and images as 1.6.0, rebuilt with the product page styling release (PR #20).
- kmpl-site-content-1.6.0.zip: same pages as 1.5.0; the New Car Finance banner section has the "Animate text" section style (scroll text reveal).
- kmpl-site-content-1.5.0.zip: same pages as 1.4.0; the New Car Finance mobile hero uses the cleaned photo (car-loan/hero-1-mobile-clean.jpg) and the footer social links are Instagram and Facebook.
- kmpl-site-content-1.4.0.zip: same pages as 1.3.0; the home page now uses the rebuilt hero photo (hero-car-loans-v2.jpg) and offer photos without baked black corners (offer-*-clean.jpg).
- kmpl-site-content-1.3.0.zip (superseded): home, car-loan, two-wheeler-loan, loan-against-property, dealer-finance, top-up-loan, car-lease, used-car-loan, about-us, contact-us, fragments/nav (mega menus with the Figma copy, search suggestions, language), fragments/footer, modals/apply-now (lead form) and the 8 modals/* Read more pages, plus 140 images under /content/dam/milan-aem-coder/.
- kmpl-site-content-1.2.0.zip (superseded): same pages, earlier nav copy.
- kmpl-site-content-1.1.0.zip (superseded): the same pages without the interactive states.
- kmpl-home-content-1.0.0.zip (superseded): home page and fragments only.

Install: AEM Tools > Deployment > Packages > Upload Package > Install.
Then reprocess the assets under /content/dam/milan-aem-coder and publish (preview and live) the pages, fragments/nav, fragments/footer and everything under modals/.
