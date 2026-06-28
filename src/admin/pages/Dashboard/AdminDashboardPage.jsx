import { useEffect, useState } from 'react';

const statLabels = {
    users_total: 'Пользователи',
    students_total: 'Ученики',
    teachers_total: 'Преподаватели',
    admins_total: 'Админы',
    blocked_users_total: 'Заблокированы',
    teachers_new_total: 'Преподаватели на проверке',
    requests_pending_total: 'Новые заявки',
    lessons_planned_total: 'Запланированные уроки',
    homework_assigned_total: 'Домашние задания',
    messages_total: 'Сообщения',
    reports_new_total: 'Жалобы',
    reviews_pending_total: 'Отзывы на проверке',
    payments_paid_total: 'Оплаченные платежи',
    payouts_pending_total: 'Выплаты в ожидании',
};

export function AdminDashboardPage() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const response = await fetch('/api/admin/dashboard/stats.php', {
                    credentials: 'include',
                });

                const data = await response.json();

                if (!data.success) {
                    setError(data.message || 'Ошибка загрузки статистики');
                    return;
                }

                setStats(data.data);
            } catch {
                setError('Не удалось подключиться к серверу');
            } finally {
                setIsLoading(false);
            }
        }

        loadStats();
    }, []);

    if (isLoading) {
        return (
            <div className="admin-page">
                <p className="admin-muted">Загружаем статистику...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <div className="admin-alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-page__head">
                <div>
                    <p className="admin-page__eyebrow">Обзор платформы</p>
                    <h2 className="admin-page__title">Панель управления</h2>
                </div>
            </div>

            <div className="admin-stats-grid">
                {Object.entries(statLabels).map(([key, label]) => (
                    <article className="admin-stat-card" key={key}>
                        <span className="admin-stat-card__label">
                            {label}
                        </span>
                        <strong className="admin-stat-card__value">
                            {stats?.[key] ?? 0}
                        </strong>
                    </article>
                ))}
            </div>
        </div>
    );
}