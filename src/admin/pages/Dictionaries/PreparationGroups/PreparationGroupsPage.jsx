import {
    CrudPage,
} from '../../../components/crud/index.js';

import {
    preparationGroupsConfig,
} from '../../../config/crud/preparationGroups.js';

export function PreparationGroupsPage() {
    return (
        <CrudPage
            config={preparationGroupsConfig}
        />
    );
}