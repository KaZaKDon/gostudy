import { useMemo, useState } from 'react';

import {
    ALL_SUBJECTS_ID,
    MATERIAL_TABS,
} from './constants.js';

import {
    getFilteredMaterialGroups,
    getSubjectsFromMaterials,
} from './utils.js';

import { MaterialsSubjectSidebar } from './components/MaterialsSubjectSidebar.jsx';
import { MaterialsGroupRow } from './components/MaterialsGroupRow.jsx';

import './MaterialsSection.css';

const EMPTY_MATERIALS = [];

export function MaterialsSection({ role, materials = {} }) {
    const [activeTab, setActiveTab] = useState('textbooks');
    const [activeSubject, setActiveSubject] = useState(ALL_SUBJECTS_ID);

    const currentMaterials = useMemo(() => {
        return materials[activeTab] ?? EMPTY_MATERIALS;
    }, [materials, activeTab]);

    const subjects = useMemo(() => {
        return getSubjectsFromMaterials(currentMaterials);
    }, [currentMaterials]);

    const filteredMaterials = useMemo(() => {
        return getFilteredMaterialGroups(currentMaterials, activeSubject);
    }, [currentMaterials, activeSubject]);

    const handleChangeTab = (tabId) => {
        setActiveTab(tabId);
        setActiveSubject(ALL_SUBJECTS_ID);
    };

    return (
        <section className="materials-section">
            <header className="materials-section__header">
                <div>
                    <span>Библиотека</span>
                    <h2>Материалы</h2>
                </div>

                <button type="button">
                    Загрузить материал
                </button>
            </header>

            <div className="materials-section__tabs">
                {MATERIAL_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={
                            activeTab === tab.id
                                ? 'materials-section__tab materials-section__tab--active'
                                : 'materials-section__tab'
                        }
                        onClick={() => handleChangeTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="materials-layout">
                <MaterialsSubjectSidebar
                    subjects={subjects}
                    activeSubject={activeSubject}
                    onSelectSubject={setActiveSubject}
                />

                <div className="materials-content">
                    {filteredMaterials.length > 0 ? (
                        filteredMaterials.map((group) => (
                            <MaterialsGroupRow
                                key={group.id}
                                role={role}
                                group={group}
                                isExtraMaterial={activeTab === 'extra'}
                            />
                        ))
                    ) : (
                        <p className="materials-content__empty">
                            Материалы не найдены.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}