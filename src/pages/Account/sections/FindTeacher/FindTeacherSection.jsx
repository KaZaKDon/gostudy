import {
    useEffect,
    useState,
} from 'react';

import {
    API,
} from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

import { TeacherSearchFilters } from './components/TeacherSearchFilters.jsx';
import { TeacherSearchList } from './components/TeacherSearchList.jsx';
import { TeacherProfileModal } from './components/TeacherProfileModal.jsx';
import { PromotedTeachersSection } from './components/PromotedTeachersSection.jsx';
import {
    buildTeacherDirectorySearchParams,
    createTeacherDirectoryFilters,
} from './teacherDirectoryFilters.js';

import './FindTeacherSection.css';

function mapTeacherFromApi(teacher) {
    return {
        id: teacher.teacher_id,
        teacherId: teacher.teacher_id,
        name: teacher.name || 'Преподаватель',
        subject:
            Array.isArray(teacher.subjects) && teacher.subjects.length
                ? teacher.subjects.join(', ')
                : 'Предмет не указан',
        rating: Number(teacher.rating || 0).toFixed(1),
        reviewsCount: teacher.reviews_count || 0,
        rank: Number.isInteger(teacher.rank) ? teacher.rank : null,
        completedLessonsCount: teacher.completed_lessons_count || 0,
        badges: Array.isArray(teacher.badges) ? teacher.badges : [],
        experience:
            teacher.experience_years !== null
                ? `${teacher.experience_years} лет`
                : 'Опыт не указан',
        price:
            teacher.price_from !== null
                ? `от ${teacher.price_from} ₽`
                : 'Цена не указана',
        city: teacher.city || '',
        headline: teacher.headline || '',
        photoUrl: teacher.photo_url || null,
        isVerified: Boolean(teacher.is_verified),
        accessibilityEnabled:
            Boolean(teacher.accessibility_enabled),
    };
}

export function FindTeacherSection({
    role,
    onRequestSent,
}) {
    const [filters, setFilters] = useState(createTeacherDirectoryFilters);
    const [filterOptions, setFilterOptions] = useState({
        subjects: [],
        preparations: [],
        ageGroups: [],
        cities: [],
    });
    const [teachers, setTeachers] = useState([]);
    const [promotedTeachers, setPromotedTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        pages: 0,
    });

    const [requestStatus, setRequestStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadTeachers() {
            setRequestStatus('loading');
            setErrorMessage('');
            setPromotedTeachers([]);

            try {
                const params = buildTeacherDirectorySearchParams(
                    filters,
                    page,
                );

                const result = await apiRequest(
                    `${API.findTeachers}?${params.toString()}`,
                    {
                        signal: controller.signal,
                    },
                );

                setTeachers(
                    Array.isArray(result.teachers)
                        ? result.teachers.map(mapTeacherFromApi)
                        : [],
                );
                setPromotedTeachers(
                    Array.isArray(result.promoted_teachers)
                        ? result.promoted_teachers
                            .slice(0, 3)
                            .map(mapTeacherFromApi)
                        : [],
                );
                setFilterOptions({
                    subjects: Array.isArray(result.filters?.subjects)
                        ? result.filters.subjects
                        : [],
                    preparations: Array.isArray(result.filters?.preparations)
                        ? result.filters.preparations
                        : [],
                    ageGroups: Array.isArray(result.filters?.age_groups)
                        ? result.filters.age_groups
                        : [],
                    cities: Array.isArray(result.filters?.cities)
                        ? result.filters.cities
                        : [],
                });
                setPagination({
                    page: Number(result.pagination?.page) || page,
                    limit: Number(result.pagination?.limit) || 12,
                    total: Number(result.pagination?.total) || 0,
                    pages: Number(result.pagination?.pages) || 0,
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

        const timerId = window.setTimeout(
            loadTeachers,
            filters.search.trim() ? 350 : 0,
        );

        return () => {
            window.clearTimeout(timerId);
            controller.abort();
        };
    }, [filters, page]);

    function updateFilter(name, value) {
        setFilters((current) => ({
            ...current,
            [name]: value,
            ...(name === 'subjectId' ? { preparationId: '' } : {}),
        }));
        setPage(1);
    }

    return (
        <section className="find-teacher-section">
            <header className="find-teacher-section__header">
                <div>
                    <span>Найти преподавателя</span>
                    <h2>Рейтинг преподавателей</h2>
                </div>
            </header>

            <TeacherSearchFilters
                filters={filters}
                options={filterOptions}
                onChange={updateFilter}
                onReset={() => {
                    setFilters(createTeacherDirectoryFilters());
                    setPage(1);
                }}
            />

            {requestStatus === 'success' && (
                <PromotedTeachersSection
                    teachers={promotedTeachers}
                    onOpenTeacher={setSelectedTeacher}
                />
            )}

            {requestStatus === 'loading' ? (
                <div className="teacher-search-list__empty">
                    Загружаем преподавателей...
                </div>
            ) : requestStatus === 'error' ? (
                <div className="teacher-search-list__empty">
                    {errorMessage}
                </div>
            ) : (
                <TeacherSearchList
                    teachers={teachers}
                    onOpenTeacher={setSelectedTeacher}
                />
            )}

            {requestStatus === 'success' && pagination.pages > 1 && (
                <nav
                    className="teacher-search-pagination"
                    aria-label="Страницы списка преподавателей"
                >
                    <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                    >
                        Назад
                    </button>
                    <span>
                        Страница {pagination.page} из {pagination.pages}
                        {' · '}
                        {pagination.total} преподавателей
                    </span>
                    <button
                        type="button"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPage((current) => current + 1)}
                    >
                        Вперёд
                    </button>
                </nav>
            )}

            <TeacherProfileModal
                key={selectedTeacher?.id ?? 'closed'}
                teacher={selectedTeacher}
                role={role}
                onRequestSent={onRequestSent}
                onClose={() => setSelectedTeacher(null)}
            />
        </section>
    );
}
