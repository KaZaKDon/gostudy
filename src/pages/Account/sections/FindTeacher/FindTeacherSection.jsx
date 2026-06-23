import { useMemo, useState } from 'react';

import { demoTeachers } from './demoTeachers.js';

import { TeacherSearchFilters } from './components/TeacherSearchFilters.jsx';
import { TeacherSearchList } from './components/TeacherSearchList.jsx';
import { TeacherProfileModal } from './components/TeacherProfileModal.jsx';

import './FindTeacherSection.css';

export function FindTeacherSection({
    onSendTeacherRequest,
}) {
    const [searchValue, setSearchValue] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const filteredTeachers = useMemo(() => {
        const normalizedSearch = searchValue.trim().toLowerCase();

        if (!normalizedSearch) {
            return demoTeachers;
        }

        return demoTeachers.filter((teacher) => {
            return (
                teacher.name.toLowerCase().includes(normalizedSearch) ||
                teacher.subject.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [searchValue]);

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

            <TeacherSearchList
                teachers={filteredTeachers}
                onOpenTeacher={setSelectedTeacher}
            />

            <TeacherProfileModal
                teacher={selectedTeacher}
                onSendTeacherRequest={onSendTeacherRequest}
                onClose={() => setSelectedTeacher(null)}
            />
        </section>
    );
}