import {
    CrudPage,
} from '../../../components/crud/index.js';

import {
    subjectsConfig,
} from '../../../config/crud/subjects.js';

export function SubjectsPage() {
    return (
        <CrudPage
            config={subjectsConfig}
        />
    );
}