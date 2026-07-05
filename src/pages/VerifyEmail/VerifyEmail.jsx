import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { API } from '../../api/api';

import './VerifyEmail.css';

const STATUS_CONTENT = {
    loading: {
        title: 'Проверяем ссылку',
        text: 'Пожалуйста, подождите. Мы подтверждаем вашу электронную почту.',
        buttonText: '',
        buttonLink: '',
    },
    waiting: {
        title: 'Подтвердите электронную почту',
        text: 'Мы уже отправили письмо для подтверждения. Проверьте почту или запросите новое письмо.',
        buttonText: 'Отправить письмо повторно',
        buttonLink: '',
    },
    success: {
        title: 'Электронная почта подтверждена',
        text: 'Спасибо! Теперь вы можете войти в GoStudy и продолжить заполнение профиля.',
        buttonText: 'Войти',
        buttonLink: '/login',
    },
    expired: {
        title: 'Срок действия ссылки истёк',
        text: 'Ссылка подтверждения действует 24 часа. Отправьте новое письмо для подтверждения почты.',
        buttonText: 'Отправить письмо повторно',
        buttonLink: '',
    },
    resent: {
        title: 'Новое письмо отправлено',
        text: 'Проверьте электронную почту. Мы отправили новую ссылку подтверждения.',
        buttonText: 'Войти',
        buttonLink: '/login',
    },
    invalid: {
        title: 'Ссылка недействительна',
        text: 'Возможно, ссылка уже была использована или содержит ошибку.',
        buttonText: 'На главную',
        buttonLink: '/',
    },
};

export function VerifyEmail() {
    const [searchParams] = useSearchParams();

    const token = useMemo(
        () => searchParams.get('token') || '',
        [searchParams]
    );

    const emailFromQuery = useMemo(
        () => searchParams.get('email') || '',
        [searchParams]
    );

    const initialStatus = token
        ? 'loading'
        : emailFromQuery
            ? 'waiting'
            : 'invalid';

    const [status, setStatus] = useState(initialStatus);
    const [email, setEmail] = useState(emailFromQuery);
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        let isMounted = true;

        const verifyEmail = async () => {
            try {
                const response = await fetch(
                    `${API.verifyEmail}?token=${encodeURIComponent(token)}`
                );

                const result = await response.json();

                if (!isMounted) {
                    return;
                }

                if (response.ok && result.success) {
                    setStatus('success');
                    return;
                }

                if (response.status === 410) {
                    setEmail(result.email || '');
                    setStatus('expired');
                    return;
                }

                setStatus('invalid');
            } catch {
                if (isMounted) {
                    setStatus('invalid');
                }
            }
        };

        verifyEmail();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const handleResend = async () => {
        if (!email || isResending) {
            return;
        }

        setIsResending(true);
        setMessage('');

        try {
            const response = await fetch(API.resendVerification, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Не удалось отправить письмо');
            }

            setStatus('resent');
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось отправить письмо'
            );
        } finally {
            setIsResending(false);
        }
    };

    const content = STATUS_CONTENT[status];

    return (
        <main className="verify-email-page">
            <section className={`verify-email-card verify-email-card--${status}`}>
                <div className="verify-email-card__visual">
                    <div className={`mail-envelope mail-envelope--${status}`}>
                        <div className="mail-envelope__paper">
                            <span>GoStudy</span>
                        </div>

                        <div className="mail-envelope__back" />
                        <div className="mail-envelope__body" />
                        <div className="mail-envelope__flap" />

                        <div className="mail-envelope__seal">
                            {(status === 'success' || status === 'resent') && 'GS'}
                            {(status === 'expired' || status === 'waiting') && '⏳'}
                            {status === 'invalid' && '×'}
                            {status === 'loading' && '…'}
                        </div>
                    </div>
                </div>

                <div className="verify-email-card__content">
                    <p className="verify-email-card__eyebrow">
                        Подтверждение почты
                    </p>

                    <h1>{content.title}</h1>

                    <p>{content.text}</p>

                    {email && (status === 'waiting' || status === 'expired') && (
                        <p className="verify-email-card__email">
                            {email}
                        </p>
                    )}

                    {message && (
                        <p className="verify-email-card__message">
                            {message}
                        </p>
                    )}

                    {(status === 'waiting' || status === 'expired') ? (
                        <button
                            type="button"
                            className="verify-email-card__button"
                            disabled={!email || isResending}
                            onClick={handleResend}
                        >
                            {isResending
                                ? 'Отправляем...'
                                : content.buttonText}
                        </button>
                    ) : (
                        content.buttonText && (
                            <Link
                                className="verify-email-card__button"
                                to={content.buttonLink}
                            >
                                {content.buttonText}
                            </Link>
                        )
                    )}
                </div>
            </section>
        </main>
    );
}