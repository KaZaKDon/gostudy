import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformIdentityProvider } from './features/platform-identity/PlatformIdentityProvider.jsx';
import { MemoryRouter } from 'react-router-dom';

import { AboutPage } from './pages/About/AboutPage.jsx';
import { PaymentAndRefundsPage } from './pages/CommercialInfo/PaymentAndRefundsPage.jsx';
import { RequisitesPage } from './pages/CommercialInfo/RequisitesPage.jsx';
import { SupportPage } from './pages/CommercialInfo/SupportPage.jsx';
import { LegalPage } from './data/legal/LegalPage.jsx';
import { getLegalDocument } from './data/legal/legalDocuments.js';
import { Home } from './pages/Home/Home.jsx';
import { NotFoundPage } from './pages/NotFound/NotFoundPage.jsx';
import { PricingPage } from './pages/Pricing/PricingPage.jsx';
import { StudentsPage } from './pages/Students/StudentsPage.jsx';
import { TeachersPage } from './pages/Teachers/TeachersPage.jsx';

const PUBLIC_PAGE_COMPONENTS = Object.freeze({
    home: Home,
    about: AboutPage,
    students: StudentsPage,
    teachers: TeachersPage,
    pricing: PricingPage,
    paymentAndRefunds: PaymentAndRefundsPage,
    requisites: RequisitesPage,
    support: SupportPage,
});

export async function renderPublicPage(pathname, renderKey, initialData = {}) {
    const [pageType, documentType] = renderKey.split(':');
    const Page = PUBLIC_PAGE_COMPONENTS[pageType];

    if (pageType === 'notFound') {
        return renderToStaticMarkup(
            <MemoryRouter initialEntries={[pathname]}>
                <div className="app"><NotFoundPage /></div>
            </MemoryRouter>,
        );
    }

    if (!Page && pageType !== 'legal') {
        throw new Error(`Unknown public page renderer: ${renderKey}`);
    }

    const initialContent = pageType === 'legal'
        ? await getLegalDocument(documentType).loadContent()
        : '';

    return renderToStaticMarkup(
        <MemoryRouter initialEntries={[pathname]}>
            <PlatformIdentityProvider initialIdentity={initialData.identity}><div className="app">
                {pageType === 'legal'
                    ? <LegalPage documentType={documentType} initialContent={initialContent} />
                    : <Page initialPublication={initialData.tariffPublication} />}
            </div></PlatformIdentityProvider>
        </MemoryRouter>,
    );
}
