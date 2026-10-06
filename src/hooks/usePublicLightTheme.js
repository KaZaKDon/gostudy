import { useLayoutEffect } from 'react';

export function usePublicLightTheme() {
    useLayoutEffect(() => {
        document.documentElement.dataset.theme = 'light';
    }, []);
}
