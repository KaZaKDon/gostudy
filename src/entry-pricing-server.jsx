import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PlatformIdentityProvider } from './features/platform-identity/PlatformIdentityProvider.jsx';
import { PricingPage } from './pages/Pricing/PricingPage.jsx';
import { renderPublicPage } from './entry-server.jsx';
import { PUBLIC_ROUTES, getSeoConfig } from './components/Seo/seoConfig.js';
import { isTariffPublication } from './features/public-tariffs/tariffPublication.js';
export { isTariffPublication };
export function renderSitePage(pathname, identity, publication) {
    const route = PUBLIC_ROUTES[pathname];
    if (!route) throw new Error('Unknown public page');
    if (pathname === '/pricing' && !isTariffPublication(publication)) throw new Error('Published tariff content is invalid');
    return renderPublicPage(pathname, route.renderKey, { identity, tariffPublication: publication });
}
export function siteStructuredData(pathname, identity) {
    return getSeoConfig(pathname, identity).structuredData;
}
export function renderPricingPage(publication, identity) {
    if (!isTariffPublication(publication)) throw new Error('Published tariff content is invalid');
    return renderToStaticMarkup(<PlatformIdentityProvider initialIdentity={identity}><MemoryRouter initialEntries={['/pricing']}><div className="app"><PricingPage initialPublication={publication} /></div></MemoryRouter></PlatformIdentityProvider>);
}
