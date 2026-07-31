import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    HOMEWORK_STATUSES,
    HOMEWORK_STATUS_LABELS,
} from './constants.js';
import {
    formatHomeworkDate,
    getHomeworkByStatus,
} from './utils.js';
import { CreateHomeworkModal } from './components/CreateHomeworkModal.jsx';
import { HomeworkList } from './components/HomeworkList.jsx';
import { HomeworkReviewModal } from './components/HomeworkReviewModal.jsx';
import { HomeworkStatusTabs } from './components/HomeworkStatusTabs.jsx';

import './HomeworkSection.css';

export function HomeworkSection({
    role,
    controller,
    targetHomeworkId,
    createRelationId,
    createLessonId,
    onCloseCreate,
}) {
    const isTeacher = role === 'teacher';
    const [activeStatus, setActiveStatus] = useState(
        isTeacher ? HOMEWORK_STATUSES[0].id : 'progress',
    );
    const [isCreateOpen, setIsCreateOpen] = useState(
        () => isTeacher && Boolean(
            createRelationId || createLessonId,
        ),
    );
    const [detailsError, setDetailsError] = useState('');
    const { loadDetails } = controller;

    const decoratedHomework = useMemo(() => controller.homework.map((item) => ({
        ...item,
        display_status_label:
            HOMEWORK_STATUS_LABELS[item.display_status] || item.display_status,
        due_date_label: formatHomeworkDate(item.due_date),
    })), [controller.homework]);

    const filteredHomework = useMemo(
        () => getHomeworkByStatus(decoratedHomework, activeStatus),
        [activeStatus, decoratedHomework],
    );

    useEffect(() => {
        if (!targetHomeworkId) {
            return;
        }

        loadDetails(targetHomeworkId).catch((error) => {
            setDetailsError(error.message);
        });
    }, [loadDetails, targetHomeworkId]);

    const closeCreate = () => {
        setIsCreateOpen(false);
        onCloseCreate?.();
    };

    const openHomework = (item) => {
        setDetailsError('');
        loadDetails(item.id).catch((error) => {
            setDetailsError(error.message);
        });
    };

    return (
        <section className="homework-section">
            <header className="homework-section__header homework-section__header--actions">
                <div>
                    <span>Домашние работы</span>
                    <h2>{isTeacher ? 'Задания учеников' : 'Мои задания'}</h2>
                </div>

                {isTeacher && (
                    <button
                        type="button"
                        className="homework-section__create"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        Выдать задание
                    </button>
                )}
            </header>

            {(controller.errorMessage || detailsError) && (
                <p className="homework-form__error">
                    {detailsError || controller.errorMessage}
                </p>
            )}

            {controller.status === 'loading' && controller.homework.length === 0 ? (
                <div className="homework-list__empty">Загружаем домашние задания...</div>
            ) : (
                <div className="homework-section__layout">
                    <HomeworkStatusTabs
                        homework={decoratedHomework}
                        activeStatus={activeStatus}
                        onChangeStatus={setActiveStatus}
                    />

                    <HomeworkList
                        homework={filteredHomework}
                        role={role}
                        onOpenHomework={openHomework}
                    />
                </div>
            )}

            <HomeworkReviewModal
                role={role}
                homework={controller.selectedHomework}
                isSaving={controller.isSaving}
                uploadLimits={controller.uploadLimits}
                onSubmit={controller.submitHomework}
                onReview={controller.reviewHomework}
                onCancelHomework={controller.cancelHomework}
                onClose={controller.closeDetails}
            />

            {isCreateOpen && (
                <CreateHomeworkModal
                    options={controller.options}
                    isSaving={controller.isSaving}
                    uploadLimits={controller.uploadLimits}
                    initialRelationId={createRelationId}
                    initialLessonId={createLessonId}
                    onLoadOptions={controller.loadOptions}
                    onCreate={controller.createHomework}
                    onClose={closeCreate}
                />
            )}
        </section>
    );
}
