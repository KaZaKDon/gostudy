import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../../api/api.js';

import { StudentReviews } from './components/StudentReviews.jsx';
import { TeacherReviews } from './components/TeacherReviews.jsx';
import { ReviewModal } from './components/ReviewModal.jsx';

import './ReviewsSection.css';

const TEACHER_STATUS_TABS = [
    {
        id: 'active',
        label: 'Активные',
    },
    {
        id: 'requests',
        label: 'Заявки',
    },
    {
        id: 'archive',
        label: 'Архив',
    },
];

function mapActiveTeacher(teacher) {
    return {
        id: `active-${teacher.id}`,
        relationId: teacher.id,
        teacherId: teacher.teacher_id,
        teacherName: teacher.teacher_name || 'Преподаватель',
        subject: teacher.subject || 'Предмет не указан',
        status: 'active',
        headline: teacher.headline || '',
        city: teacher.city || '',
        experienceYears: teacher.experience_years,
        startedAt: teacher.started_at,
        rating: null,
        reviewText: '',
    };
}

function mapArchivedTeacher(teacher) {
    return {
        id: `archive-${teacher.id}`,
        relationId: teacher.id,
        teacherId: teacher.teacher_id,
        teacherName: teacher.teacher_name || 'Преподаватель',
        subject: teacher.subject || 'Предмет не указан',
        status: 'archive',
        archiveText: 'Обучение завершено',
    };
}

function mapTeacherRequest(request) {
    return {
        id: `request-${request.id}`,
        requestId: request.id,
        teacherId: request.teacher_id,
        teacherName: request.teacher_name || 'Преподаватель',
        subject: request.subject || 'Предмет не указан',
        status: 'requests',
        requestStatus: 'Ожидает ответа преподавателя',
        createdAt: request.created_at,
    };
}

export function ReviewsSection({
    role,
    reviews = [],
    onFindTeacher,
}) {
    const isTeacher = role === 'teacher';

    const [activeStatus, setActiveStatus] = useState('active');
    const [selectedReview, setSelectedReview] = useState(null);

    const [studentTeachers, setStudentTeachers] = useState({
        active: [],
        requests: [],
        archive: [],
    });

    const [requestStatus, setRequestStatus] = useState(
        isTeacher ? 'success' : 'loading',
    );

    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isTeacher) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadTeachers() {
            try {
                const response = await fetch(API.studentTeachers, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить преподавателей',
                    );
                }

                const teachers = result.teachers || {};

                setStudentTeachers({
                    active: Array.isArray(teachers.active)
                        ? teachers.active.map(mapActiveTeacher)
                        : [],

                    requests: Array.isArray(teachers.requests)
                        ? teachers.requests.map(mapTeacherRequest)
                        : [],

                    archive: Array.isArray(teachers.archive)
                        ? teachers.archive.map(mapArchivedTeacher)
                        : [],
                });

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
                        : 'Не удалось загрузить преподавателей',
                );

                setRequestStatus('error');
            }
        }

        loadTeachers();

        return () => {
            controller.abort();
        };
    }, [isTeacher]);

    const displayedReviews = useMemo(() => {
        if (isTeacher) {
            return reviews;
        }

        return studentTeachers[activeStatus] || [];
    }, [
        activeStatus,
        isTeacher,
        reviews,
        studentTeachers,
    ]);

    const handleOpenReview = (teacher) => {
        if (activeStatus !== 'active') {
            return;
        }

        setSelectedReview(teacher);
    };

    return (
        <section className="reviews-section">
            <header className="reviews-section__header">
                <div>
                    <span>
                        {isTeacher
                            ? 'Отзывы'
                            : 'Мои преподаватели'}
                    </span>

                    <h2>
                        {isTeacher
                            ? 'Отзывы учеников'
                            : 'Преподаватели и заявки'}
                    </h2>
                </div>

                {!isTeacher && (
                    <div className="reviews-section__status-tabs">
                        {TEACHER_STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={
                                    activeStatus === tab.id
                                        ? 'reviews-section__status-tab reviews-section__status-tab--active'
                                        : 'reviews-section__status-tab'
                                }
                                onClick={() => {
                                    setActiveStatus(tab.id);
                                    setSelectedReview(null);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {!isTeacher && requestStatus === 'loading' ? (
                <div className="reviews-list__empty">
                    Загружаем преподавателей...
                </div>
            ) : !isTeacher && requestStatus === 'error' ? (
                <div className="reviews-list__empty">
                    {errorMessage}
                </div>
            ) : isTeacher ? (
                <TeacherReviews
                    reviews={displayedReviews}
                    onOpenReview={setSelectedReview}
                />
            ) : (
                <StudentReviews
                    teachers={displayedReviews}
                    activeStatus={activeStatus}
                    onOpenReview={handleOpenReview}
                    onFindTeacher={onFindTeacher}
                />
            )}

            <ReviewModal
                key={selectedReview?.id ?? 'closed'}
                role={role}
                review={selectedReview}
                onClose={() => setSelectedReview(null)}
            />
        </section>
    );
}