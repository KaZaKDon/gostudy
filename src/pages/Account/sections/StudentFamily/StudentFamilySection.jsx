import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

import './StudentFamilySection.css';

export function StudentFamilySection() {
    const [requests, setRequests] = useState([]);
    const [parents, setParents] = useState([]);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [activeRequestId, setActiveRequestId] = useState(null);

    const load = useCallback(async () => {
        setStatus('loading');
        setMessage('');
        try {
            const result = await apiRequest(API.studentParentLinkRequests);
            setRequests(result.requests || []);
            setParents(result.parents || []);
            setStatus('success');
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error
                ? error.message
                : 'Не удалось загрузить семейные связи');
        }
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(load, 0);
        return () => window.clearTimeout(timerId);
    }, [load]);

    async function respond(requestId, accept) {
        setActiveRequestId(requestId);
        setMessage('');
        try {
            const result = await apiRequest(
                `${API.studentParentLinkRequests}/${requestId}/respond`,
                { method: 'POST', body: { accept } },
            );
            await load();
            setMessage(result.message);
        } catch (error) {
            setMessage(error instanceof Error
                ? error.message
                : 'Не удалось сохранить ответ');
            setStatus('error');
        } finally {
            setActiveRequestId(null);
        }
    }

    return (
        <section className="student-family">
            <header>
                <span>Безопасность</span>
                <h2>Родитель и семейные связи</h2>
                <p>
                    Подтверждайте только знакомого вам родителя или законного
                    представителя.
                </p>
            </header>

            {message && (
                <p className={`student-family__message is-${status}`}>
                    {message}
                </p>
            )}

            {status === 'loading' && <p>Загружаем данные...</p>}

            {parents.length > 0 && (
                <div className="student-family__group">
                    <h3>Подтверждённые представители</h3>
                    {parents.map((parent) => (
                        <article key={parent.id} className="student-family-card is-linked">
                            <div>
                                <span>Родитель / представитель</span>
                                <h3>{parent.full_name}</h3>
                            </div>
                            <p>{parent.email} · {parent.phone || 'Телефон не указан'}</p>
                            <strong>Связь подтверждена</strong>
                        </article>
                    ))}
                </div>
            )}

            {requests.length > 0 && (
                <div className="student-family__group">
                    <h3>Запросы на подтверждение</h3>
                    {requests.map((request) => (
                        <article key={request.id} className="student-family-card">
                            <div>
                                <span>Запрос от представителя</span>
                                <h3>{request.parent.full_name}</h3>
                            </div>
                            <p>{request.parent.email} · {request.parent.phone || 'Телефон не указан'}</p>
                            <p>Карточка: {request.child.full_name}</p>
                            <div className="student-family-card__actions">
                                <button
                                    type="button"
                                    disabled={activeRequestId === request.id}
                                    onClick={() => respond(request.id, true)}
                                >
                                    Подтвердить
                                </button>
                                <button
                                    type="button"
                                    disabled={activeRequestId === request.id}
                                    onClick={() => respond(request.id, false)}
                                >
                                    Отклонить
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {status !== 'loading' && parents.length === 0 && requests.length === 0 && (
                <div className="student-family__empty">
                    <h3>Семейных связей пока нет</h3>
                    <p>Здесь появится запрос, отправленный из кабинета родителя.</p>
                </div>
            )}
        </section>
    );
}
