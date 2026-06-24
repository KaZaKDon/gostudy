import { useState } from 'react';

import { StudentReviews } from './components/StudentReviews.jsx';
import { TeacherReviews } from './components/TeacherReviews.jsx';
import { ReviewModal } from './components/ReviewModal.jsx';

import './ReviewsSection.css';

const TEACHER_STATUS_TABS = [
    { id: 'active', label: 'Активные' },
    { id: 'requests', label: 'Заявки' },
    { id: 'archive', label: 'Архив' },
];

export function ReviewsSection({ role, reviews }) {
    const [activeStatus, setActiveStatus] = useState('active');
    const [selectedReview, setSelectedReview] = useState(null);

    const isTeacher = role === 'teacher';

    const filteredReviews = isTeacher
        ? reviews
        : reviews.filter((teacher) => {
            const teacherStatus = teacher.status ?? 'active';

            return teacherStatus === activeStatus;
        });

    return (
        <section className="reviews-section">
            <header className="reviews-section__header">
                <div>
                    <span>
                        {isTeacher ? 'Отзывы' : 'Мои преподаватели'}
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
                                onClick={() => setActiveStatus(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {isTeacher ? (
                <TeacherReviews
                    reviews={filteredReviews}
                    onOpenReview={setSelectedReview}
                />
            ) : (
                <StudentReviews
                    teachers={filteredReviews}
                    activeStatus={activeStatus}
                    onOpenReview={setSelectedReview}
                />
            )}

            <ReviewModal
                role={role}
                review={selectedReview}
                onClose={() => setSelectedReview(null)}
            />
        </section>
    );
}