import { useMemo, useState } from 'react';

import {
    ALL_SUBJECTS_ID,
    MATERIAL_TABS,
    MATERIAL_VIEWS,
} from './constants.js';

import {
    getFilteredMaterialGroups,
    getSubjectsFromMaterials,
} from './utils.js';

import { MaterialsSubjectSidebar } from './components/MaterialsSubjectSidebar.jsx';
import { MaterialsGroupRow } from './components/MaterialsGroupRow.jsx';
import { AssignMaterialModal } from './components/AssignMaterialModal.jsx';
import { MaterialEditorModal } from './components/MaterialEditorModal.jsx';
import { ReportMaterialModal } from './components/ReportMaterialModal.jsx';

import './MaterialsSection.css';

const EMPTY_MATERIALS = [];

export function MaterialsSection({ role, controller }) {
    const [activeTab, setActiveTab] = useState('textbook');
    const [activeSubject, setActiveSubject] = useState(ALL_SUBJECTS_ID);
    const [editorMaterial, setEditorMaterial] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [assignmentMaterial, setAssignmentMaterial] = useState(null);
    const [reportMaterial, setReportMaterial] = useState(null);

    const currentMaterials = useMemo(() => {
        return (controller?.materials || EMPTY_MATERIALS)
            .filter((material) => material.category === activeTab);
    }, [controller?.materials, activeTab]);

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

    if (!controller) {
        return <p className="materials-content__empty">Раздел материалов загружается...</p>;
    }

    const views = MATERIAL_VIEWS[role] || MATERIAL_VIEWS.student;

    return (
        <section className="materials-section">
            <header className="materials-section__header">
                <div>
                    <span>Библиотека</span>
                    <h2>Материалы</h2>
                </div>

                {role === 'teacher' && (
                    <button type="button" onClick={() => {
                        controller.clearMessages();
                        setEditorMaterial(null);
                        setIsEditorOpen(true);
                    }}>
                        Загрузить материал
                    </button>
                )}
            </header>

            <div className="materials-section__views" aria-label="Источник материалов">
                {views.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={controller.view === item.id ? 'materials-section__view materials-section__view--active' : 'materials-section__view'}
                        onClick={() => {
                            setActiveSubject(ALL_SUBJECTS_ID);
                            controller.setView(item.id);
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {controller.errorMessage && <p className="materials-message materials-message--error">{controller.errorMessage}</p>}
            {controller.notice && <p className="materials-message materials-message--success">{controller.notice}</p>}

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
                    {controller.status === 'loading' ? (
                        <p className="materials-content__empty">Загружаем материалы...</p>
                    ) : filteredMaterials.length > 0 ? (
                        filteredMaterials.map((group) => (
                            <MaterialsGroupRow
                                key={group.id}
                                role={role}
                                group={group}
                                view={controller.view}
                                isSaving={controller.isSaving}
                                onOpenItem={controller.openItem}
                                onEdit={(material) => {
                                    setEditorMaterial(material);
                                    setIsEditorOpen(true);
                                }}
                                onAssign={setAssignmentMaterial}
                                onSubmitModeration={(id) => controller.submitModeration(id).catch(() => {})}
                                onHide={(id) => controller.hide(id).catch(() => {})}
                                onReport={setReportMaterial}
                            />
                        ))
                    ) : (
                        <p className="materials-content__empty">
                            Материалы не найдены.
                        </p>
                    )}
                </div>
            </div>

            {isEditorOpen && (
                <MaterialEditorModal
                    material={editorMaterial}
                    options={controller.options}
                    uploadLimits={controller.uploadLimits}
                    isSaving={controller.isSaving}
                    onLoadOptions={controller.loadOptions}
                    onCreate={controller.create}
                    onUpdate={controller.update}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}

            <AssignMaterialModal
                key={assignmentMaterial?.id || 'closed'}
                material={assignmentMaterial}
                options={controller.options}
                isSaving={controller.isSaving}
                onLoadOptions={controller.loadOptions}
                onAssign={controller.assign}
                onUnassign={controller.unassign}
                onClose={() => setAssignmentMaterial(null)}
            />

            <ReportMaterialModal
                key={reportMaterial?.id || 'closed'}
                material={reportMaterial}
                isSaving={controller.isSaving}
                onReport={controller.report}
                onClose={() => setReportMaterial(null)}
            />
        </section>
    );
}
