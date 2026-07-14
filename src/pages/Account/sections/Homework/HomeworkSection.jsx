import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../../api/api.js';

import { HOMEWORK_STATUSES } from './constants.js';
import { getHomeworkByStatus } from './utils.js';

import { HomeworkStatusTabs } from './components/HomeworkStatusTabs.jsx';
import { HomeworkList } from './components/HomeworkList.jsx';
import { HomeworkReviewModal } from './components/HomeworkReviewModal.jsx';
import { StudentHomeworkList } from './components/StudentHomeworkList.jsx';

import './HomeworkSection.css';

export function HomeworkSection({
    role,
    homework = [],
}) {
    const isTeacher = role === 'teacher';

    const [activeStatus, setActiveStatus] = useState(
        HOMEWORK_STATUSES[0].id,
    );

    const [selectedHomework, setSelectedHomework] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [comment, setComment] = useState('');

    const [studentHomework, setStudentHomework] = useState([]);
    const [requestStatus, setRequestStatus] = useState(
        isTeacher ? 'success' : 'loading',
    );
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isTeacher) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadStudentHomework() {
            try {
                const response = await fetch(API.studentHomework, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить домашние задания',
                    );
                }

                setStudentHomework(
                    Array.isArray(result.homework)
                        ? result.homework
                        : [],
                );

                setRequestStatus('success');
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить домашние задания',
                );

                setRequestStatus('error');
            }
        }

        loadStudentHomework();

        return () => {
            controller.abort();
        };
    }, [isTeacher]);

    const filteredHomework = useMemo(
        () =>
            isTeacher
                ? getHomeworkByStatus(homework, activeStatus)
                : [],
        [activeStatus, homework, isTeacher],
    );

    const handleOpenHomework = (item) => {
        setSelectedHomework(item);
        setSelectedGrade('');
        setComment('');
    };

    const handleCloseModal = () => {
        setSelectedHomework(null);
        setSelectedGrade('');
        setComment('');
    };

    if (!isTeacher) {
        return (
            <section className="homework-section">
                <header className="homework-section__header">
                    <div>
                        <span>Домашние задания</span>
                        <h2>Мои задания</h2>
                    </div>
                </header>

                {requestStatus === 'loading' ? (
                    <div className="homework-list__empty">
                        Загружаем домашние задания...
                    </div>
                ) : requestStatus === 'error' ? (
                    <div className="homework-list__empty">
                        {errorMessage}
                    </div>
                ) : (
                    <StudentHomeworkList
                        homework={studentHomework}
                    />
                )}
            </section>
        );
    }

    return (
        <section className="homework-section">
            <header className="homework-section__header">
                <div>
                    <span>Домашние работы</span>
                    <h2>Проверка заданий</h2>
                </div>
            </header>

            <div className="homework-section__layout">
                <HomeworkStatusTabs
                    homework={homework}
                    activeStatus={activeStatus}
                    onChangeStatus={setActiveStatus}
                />

                <HomeworkList
                    homework={filteredHomework}
                    onOpenHomework={handleOpenHomework}
                />
            </div>

            <HomeworkReviewModal
                homework={selectedHomework}
                selectedGrade={selectedGrade}
                comment={comment}
                onSelectGrade={setSelectedGrade}
                onCommentChange={setComment}
                onClose={handleCloseModal}
            />
        </section>
    );
}