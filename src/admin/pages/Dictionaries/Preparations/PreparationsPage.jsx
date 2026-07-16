import {
    CrudPage,
} from '../../../components/crud/index.js';

import {
    preparationsConfig,
} from '../../../config/crud/preparations.js';

export function PreparationsPage() {
    return (
        <CrudPage
            config={preparationsConfig}
        />
    );
}