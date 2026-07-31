import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { getSeoConfig } from './seoConfig.js';

const STRUCTURED_DATA_ID = 'gostudy-structured-data';

function setMetaContent(selector, attribute, value) {
    let element = document.head.querySelector(selector);

    if (!value) {
        element?.remove();
        return;
    }

    if (!element) {
        element = document.createElement('meta');

        const [attributeName, attributeValue] = attribute;
        element.setAttribute(attributeName, attributeValue);
        document.head.append(element);
    }

    element.setAttribute('content', value);
}

function setCanonical(href) {
    let element = document.head.querySelector('link[rel="canonical"]');

    if (!href) {
        element?.remove();
        return;
    }

    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.append(element);
    }

    element.setAttribute('href', href);
}

function setStructuredData(data) {
    let element = document.getElementById(STRUCTURED_DATA_ID);

    if (!data) {
        element?.remove();
        return;
    }

    if (!element) {
        element = document.createElement('script');
        element.id = STRUCTURED_DATA_ID;
        element.type = 'application/ld+json';
        document.head.append(element);
    }

    element.textContent = JSON.stringify(data);
}

export function SeoManager() {
    const { pathname } = useLocation();

    useEffect(() => {
        const seo = getSeoConfig(pathname);
        const pageUrl = seo.canonical ?? window.location.href.split(/[?#]/)[0];

        document.title = seo.title;

        setMetaContent(
            'meta[name="description"]',
            ['name', 'description'],
            seo.description
        );
        setMetaContent(
            'meta[name="robots"]',
            ['name', 'robots'],
            seo.robots
        );
        setMetaContent(
            'meta[property="og:title"]',
            ['property', 'og:title'],
            seo.title
        );
        setMetaContent(
            'meta[property="og:description"]',
            ['property', 'og:description'],
            seo.description
        );
        setMetaContent(
            'meta[property="og:url"]',
            ['property', 'og:url'],
            pageUrl
        );
        setMetaContent(
            'meta[property="og:image"]',
            ['property', 'og:image'],
            seo.image
        );
        setMetaContent(
            'meta[name="twitter:title"]',
            ['name', 'twitter:title'],
            seo.title
        );
        setMetaContent(
            'meta[name="twitter:description"]',
            ['name', 'twitter:description'],
            seo.description
        );
        setMetaContent(
            'meta[name="twitter:image"]',
            ['name', 'twitter:image'],
            seo.image
        );

        setCanonical(seo.canonical);
        setStructuredData(seo.structuredData);
    }, [pathname]);

    return null;
}
