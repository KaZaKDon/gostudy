import { ALL_SUBJECTS_ID } from './constants.js';

export function getSubjectsFromMaterials(materials) {
    const subjects = materials.map((group) => group.subject);

    return [ALL_SUBJECTS_ID, ...new Set(subjects)];
}

export function getSubjectLabel(subject) {
    if (subject === ALL_SUBJECTS_ID) return 'Все';

    return subject;
}

export function getFilteredMaterialGroups(materials, activeSubject) {
    if (activeSubject === ALL_SUBJECTS_ID) return materials;

    return materials.filter((group) => group.subject === activeSubject);
}

export function getMaterialCountLabel(count) {
    if (count === 1) return '1 материал';

    if (count >= 2 && count <= 4) {
        return `${count} материала`;
    }

    return `${count} материалов`;
}