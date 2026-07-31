import { lazy } from 'react';

export function lazyNamed(loader, exportName) {
    return lazy(async () => {
        const loadedModule = await loader();

        return {
            default: loadedModule[exportName],
        };
    });
}
