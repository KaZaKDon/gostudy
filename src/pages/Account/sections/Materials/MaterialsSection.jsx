import {
    useEffect,
    useMemo,
    useState,
} from 'react';

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

export function MaterialsSection({ role, controller, targetMaterialId }) {
    const [activeTab, setActiveTab] = useState('textbook');
    const [activeSubject, setActiveSubject] = useState(ALL_SUBJECTS_ID);
    const [dismissedTargetId, setDismissedTargetId] = useState(null);
    const [editorMaterial, setEditorMaterial] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [assignmentMaterial, setAssignmentMaterial] = useState(null);
    const [reportMaterial, setReportMaterial] = useState(null);

    const targetMaterial = useMemo(() => (
        targetMaterialId && dismissedTargetId !== targetMaterialId
            ? (controller?.materials || EMPTY_MATERIALS)
                .find((material) => material.id === targetMaterialId) || null
            : null
    ), [controller?.materials, dismissedTargetId, targetMaterialId]);
    const visibleTab = targetMaterial?.category || activeTab;
    const visibleSubject = targetMaterial
        ? ALL_SUBJECTS_ID
        : activeSubject;

    const currentMaterials = useMemo(() => {
        return (controller?.materials || EMPTY_MATERIALS)
            .filter((material) => material.category === visibleTab);
    }, [controller?.materials, visibleTab]);

    const subjects = useMemo(() => {
        return getSubjectsFromMaterials(currentMaterials);
    }, [currentMaterials]);

    const filteredMaterials = useMemo(() => {
        return getFilteredMaterialGroups(currentMaterials, visibleSubject);
    }, [currentMaterials, visibleSubject]);

    useEffect(() => {
        if (
            targetMaterialId
            && role === 'teacher'
            && controller?.view !== 'mine'
        ) {
            controller.setView('mine');
        }
    }, [controller, role, targetMaterialId]);

    const handleChangeTab = (tabId) => {
        setDismissedTargetId(targetMaterialId);
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
                            visibleTab === tab.id
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
                    activeSubject={visibleSubject}
                    onSelectSubject={(subject) => {
                        setDismissedTargetId(targetMaterialId);
                        setActiveSubject(subject);
                    }}
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
                                onDelete={(material) => {
                                    if (!window.confirm(
                                        `Удалить материал «${material.title}» и освободить занятое место?`,
                                    )) {
                                        return;
                                    }
                                    controller.deleteMaterial(material.id)
                                        .catch(() => {});
                                }}
                                onReport={setReportMaterial}
                                isTarget={group.id === targetMaterial?.id}
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
