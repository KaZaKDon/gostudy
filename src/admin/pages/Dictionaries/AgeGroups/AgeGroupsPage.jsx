import {
    CrudPage,
} from '../../../components/crud/index.js';

import {
    ageGroupsConfig,
} from '../../../config/crud/ageGroups.js';

export function AgeGroupsPage() {
    return (
        <CrudPage
            config={ageGroupsConfig}
        />
    );
}