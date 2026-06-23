import {
    HOMEWORK_STATUSES,
} from '../constants.js';

import {
    getHomeworkCount,
} from '../utils.js';

export function HomeworkStatusTabs({
    homework,
    activeStatus,
    onChangeStatus,
}) {
    return (
        <aside className="homework-statuses">
            {HOMEWORK_STATUSES.map((status) => (
                <button
                    key={status.id}
                    type="button"
                    className={
                        activeStatus === status.id
                            ? 'homework-statuses__button homework-statuses__button--active'
                            : 'homework-statuses__button'
                    }
                    onClick={() =>
                        onChangeStatus(status.id)
                    }
                >
                    <span>
                        {status.label}
                    </span>

                    <strong>
                        {getHomeworkCount(
                            homework,
                            status.id,
                        )}
                    </strong>
                </button>
            ))}
        </aside>
    );
}