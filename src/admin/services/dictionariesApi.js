import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

const DICTIONARIES_API_BASE = API.adminDictionaries;

function buildQuery(filters = {}) {
    const params = new URLSearchParams();

    if (filters.group_id) {
        params.set('group_id', String(filters.group_id));
    }
    if (filters.is_active !== undefined) {
        params.set('is_active', filters.is_active ? '1' : '0');
    }
    if (filters.search?.trim()) {
        params.set('search', filters.search.trim());
    }

    const query = params.toString();
    return query ? `?${query}` : '';
}

function createCrudApi(resource) {
    const url = `${DICTIONARIES_API_BASE}/${resource}`;

    return {
        getList(filters = {}) {
            return adminApiRequest(`${url}${buildQuery(filters)}`);
        },
        create(payload) {
            return adminApiRequest(url, { method: 'POST', body: payload });
        },
        update(payload) {
            const { id, ...body } = payload;
            return adminApiRequest(`${url}/${id}`, { method: 'PATCH', body });
        },
        delete(id) {
            return adminApiRequest(`${url}/${id}`, { method: 'DELETE' });
        },
    };
}

const subjectGroups = createCrudApi('subject-groups');
const subjects = createCrudApi('subjects');
const preparationGroups = createCrudApi('preparation-groups');
const preparations = createCrudApi('preparations');
const ageGroups = createCrudApi('age-groups');

export const dictionariesApi = {
    getSubjectGroups: subjectGroups.getList,
    createSubjectGroup: subjectGroups.create,
    updateSubjectGroup: subjectGroups.update,
    deleteSubjectGroup: subjectGroups.delete,

    getSubjects: subjects.getList,
    createSubject: subjects.create,
    updateSubject: subjects.update,
    deleteSubject: subjects.delete,

    getPreparationGroups: preparationGroups.getList,
    createPreparationGroup: preparationGroups.create,
    updatePreparationGroup: preparationGroups.update,
    deletePreparationGroup: preparationGroups.delete,

    getPreparations: preparations.getList,
    createPreparation: preparations.create,
    updatePreparation: preparations.update,
    deletePreparation: preparations.delete,

    getAgeGroups: ageGroups.getList,
    createAgeGroup: ageGroups.create,
    updateAgeGroup: ageGroups.update,
    deleteAgeGroup: ageGroups.delete,

    getSubjectPreparationsData() {
        return adminApiRequest(`${DICTIONARIES_API_BASE}/subject-preparations`);
    },

    getSubjectPreparationLinks(subjectId) {
        return adminApiRequest(`${DICTIONARIES_API_BASE}/subject-preparations/${subjectId}`);
    },

    updateSubjectPreparations(payload) {
        const {
            subject_id: subjectId,
            preparations: selectedPreparations,
        } = payload;

        return adminApiRequest(`${DICTIONARIES_API_BASE}/subject-preparations/${subjectId}`, {
            method: 'PUT',
            body: { preparations: selectedPreparations },
        });
    },
};
