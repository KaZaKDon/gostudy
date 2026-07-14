import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../../api/api.js';

import { TeacherSearchFilters } from './components/TeacherSearchFilters.jsx';
import { TeacherSearchList } from './components/TeacherSearchList.jsx';
import { TeacherProfileModal } from './components/TeacherProfileModal.jsx';

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
    onSendTeacherRequest,
}) {
    const [searchValue, setSearchValue] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const [requestStatus, setRequestStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadTeachers() {
            setRequestStatus('loading');
            setErrorMessage('');

            try {
                const params = new URLSearchParams();

                if (searchValue.trim()) {
                    params.set('search', searchValue.trim());
                }

                const response = await fetch(
                    `${API.findTeachers}?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: getAuthHeaders(),
                        signal: controller.signal,
                    },
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить преподавателей',
                    );
                }

                setTeachers(
                    Array.isArray(result.teachers)
                        ? result.teachers.map(mapTeacherFromApi)
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
                        : 'Не удалось загрузить преподавателей',
                );

                setRequestStatus('error');
            }
        }

        const timerId = window.setTimeout(
            loadTeachers,
            searchValue.trim() ? 350 : 0,
        );

        return () => {
            window.clearTimeout(timerId);
            controller.abort();
        };
    }, [searchValue]);

    const displayedTeachers = useMemo(
        () => teachers,
        [teachers],
    );

    return (
        <section className="find-teacher-section">
            <header className="find-teacher-section__header">
                <div>
                    <span>Найти преподавателя</span>
                    <h2>Рейтинг преподавателей</h2>
                </div>
            </header>

            <TeacherSearchFilters
                searchValue={searchValue}
                onSearchChange={setSearchValue}
            />

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
                    teachers={displayedTeachers}
                    onOpenTeacher={setSelectedTeacher}
                />
            )}

            <TeacherProfileModal
                key={selectedTeacher?.id ?? 'closed'}
                teacher={selectedTeacher}
                onSendTeacherRequest={onSendTeacherRequest}
                onClose={() => setSelectedTeacher(null)}
            />
        </section>
    );
}