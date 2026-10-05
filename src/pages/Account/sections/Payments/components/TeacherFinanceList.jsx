import {
    formatMoney,
    getPaymentStatusLabel,
    getTeacherFinanceDisplayAmounts,
} from '../utils.js';

function formatDate(value) {
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function TeacherFinanceList({ controller, onOpen }) {
    const { items, pagination } = controller.data;

    if (controller.isLoading) {
        return <div className="teacher-finance-empty">Загружаем расчёты…</div>;
    }

    if (!items.length) {
        return (
            <div className="teacher-finance-empty">
                <h3>Начислений пока нет</h3>
                <p>Измени период или фильтр. Новые записи появятся после завершения уроков.</p>
            </div>
        );
    }

    return (
        <>
            <div className="teacher-finance-list">
                {items.map((item) => {
                    const amounts = getTeacherFinanceDisplayAmounts(item);

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="teacher-finance-row"
                            onClick={() => onOpen(item)}
                        >
                            <span>
                                <strong>{item.student_name}</strong>
                                <small>{item.subject_name} · {item.duration_minutes} минут</small>
                            </span>
                            <span>
                                <strong>{formatDate(item.lesson_date)}</strong>
                                <small>{item.title}</small>
                            </span>
                            <span>
                                <strong>{formatMoney(amounts.teacherAmount)}</strong>
                                <small>
                                    {amounts.hasNoAccrual ? 'стоимость урока ' : 'из '}
                                    {formatMoney(item.gross_amount)}
                                </small>
                            </span>
                            <em className={`payment-row__status payment-row__status--${item.status}`}>
                                {getPaymentStatusLabel(item.status)}
                            </em>
                        </button>
                    );
                })}
            </div>

            {pagination.pages > 1 && (
                <div className="teacher-finance-pagination">
                    <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => controller.setPage(pagination.page - 1)}
                    >
                        Назад
                    </button>
                    <span>Страница {pagination.page} из {pagination.pages}</span>
                    <button
                        type="button"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => controller.setPage(pagination.page + 1)}
                    >
                        Дальше
                    </button>
                </div>
            )}
        </>
    );
}
