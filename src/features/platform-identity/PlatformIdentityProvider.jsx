import { useEffect, useState } from 'react';
import { API } from '../../api/api.js';
import { PLATFORM_IDENTITY } from '../../config/platformIdentity.js';
import { IdentityContext } from './identityContext.js';

function bootstrap() {
    if (typeof document === 'undefined') return PLATFORM_IDENTITY;
    try { return JSON.parse(document.getElementById('gostudy-platform-identity')?.textContent || 'null') || PLATFORM_IDENTITY; }
    catch { return PLATFORM_IDENTITY; }
}

export function PlatformIdentityProvider({ children, initialIdentity }) {
    const [identity, setIdentity] = useState(() => initialIdentity || bootstrap());
    useEffect(() => {
        if (initialIdentity) return;
        const controller = new AbortController();
        const refresh = () => {
            fetch(API.platformIdentity, { cache: 'no-store', signal: controller.signal })
                .then(async (response) => {
                    if (!response.ok) throw new Error('Identity unavailable');
                    const result = await response.json();
                    if (result.success && result.data) setIdentity(result.data);
                }).catch(() => {});
        };
        refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('gostudy:identity-updated', refresh);
        return () => {
            controller.abort();
            window.removeEventListener('focus', refresh);
            window.removeEventListener('gostudy:identity-updated', refresh);
        };
    }, [initialIdentity]);
    const value = { ...identity, supportPhoneHref: `tel:${String(identity.supportPhone).replace(/[^+0-9]/g, '')}` };
    return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
