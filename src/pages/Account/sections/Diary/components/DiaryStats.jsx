import {
    getAverageGrade,
    getTotalLessons,
} from '../utils.js';

export function DiaryStats({
    diary,
}) {
    return (
        <div className="diary-stats">
            <article className="diary-stat">
                <strong>
                    {getAverageGrade(
                        diary,
                    )}
                </strong>

                <span>
                    Средний балл
                </span>
            </article>

            <article className="diary-stat">
                <strong>
                    {getTotalLessons(
                        diary,
                    )}
                </strong>

                <span>
                    Всего занятий
                </span>
            </article>

            <article className="diary-stat">
                <strong>
                    {
                        getTotalLessons(
                            diary,
                        )
                    }
                </strong>

                <span>
                    Записей в дневнике
                </span>
            </article>
        </div>
    );
}