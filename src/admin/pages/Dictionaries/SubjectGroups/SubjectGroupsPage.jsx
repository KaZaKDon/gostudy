import {
    CrudPage,
} from '../../../components/crud/index.js';

import {
    subjectGroupsConfig,
} from '../../../config/crud/subjectGroups.js';

export function SubjectGroupsPage() {
    return (
        <CrudPage
            config={subjectGroupsConfig}
        />
    );
}