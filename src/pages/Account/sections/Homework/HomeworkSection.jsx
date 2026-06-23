import { useMemo, useState } from 'react';

import { HOMEWORK_STATUSES } from './constants.js';
import { getHomeworkByStatus } from './utils.js';

import { HomeworkStatusTabs } from './components/HomeworkStatusTabs.jsx';
import { HomeworkList } from './components/HomeworkList.jsx';
import { HomeworkReviewModal } from './components/HomeworkReviewModal.jsx';

import './HomeworkSection.css';

export function HomeworkSection({ homework = []}) {
    const [activeStatus, setActiveStatus] = useState(
        HOMEWORK_STATUSES[0].id,
    );
    const [selectedHomework, setSelectedHomework] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [comment, setComment] = useState('');

    const filteredHomework = useMemo(
        () => getHomeworkByStatus(homework, activeStatus),
        [homework, activeStatus],
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