import { useState } from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

import { VERIFICATION_LABELS } from '../constants.js';
import { SettingsMessage } from './SettingsMessage.jsx';

function toBoolean(value) {
    return value === true || Number(value) === 1;
}

export function TeacherVisibilitySettings({ profile }) {
    const verificationStatus = profile?.verification_status || 'draft';
    const [isVisible, setIsVisible] = useState(toBoolean(profile?.is_visible));
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const save = async () => {
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.updateTeacherVisibility, {
                method: 'POST',
                body: { is_visible: isVisible },
            });

            setIsVisible(result.profile.is_visible);
            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const canEnable = verificationStatus === 'approved';
    const isSaving = status === 'saving';

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>Публичная анкета</h3>
            </header>

            <section className="settings-card">
                <div>
                    <h4>Статус проверки</h4>
                    <p>
                        {VERIFICATION_LABELS[verificationStatus]
                            || verificationStatus}
                    </p>
                </div>

                <strong
                    className={
                        verificationStatus === 'approved'
                            ? 'settings-status settings-status--success'
                            : 'settings-status'
                    }
                >
                    {verificationStatus === 'approved'
                        ? 'Подтверждена'
                        : 'Не опубликована'}
                </strong>
            </section>

            <section className="settings-card">
                <div>
                    <h4>Показывать анкету в поиске</h4>
                    <p>
                        При выключении новые ученики не увидят карточку,
                        но текущие связи, уроки и переписка сохранятся.
                    </p>
                </div>

                <label className="settings-switch">
                    <input
                        type="checkbox"
                        checked={isVisible}
                        disabled={isSaving || (!isVisible && !canEnable)}
                        onChange={(event) => setIsVisible(event.target.checked)}
                    />
                    <span>{isVisible ? 'Показывается' : 'Скрыта'}</span>
                </label>
            </section>

            {!canEnable && !isVisible && (
                <p className="settings-panel__note">
                    Включить показ можно после подтверждения анкеты
                    модератором.
                </p>
            )}

            <SettingsMessage
                type={status === 'error' ? 'error' : 'success'}
            >
                {message}
            </SettingsMessage>

            <div className="settings-panel__actions">
                <button
                    type="button"
                    className="settings-panel__save"
                    disabled={isSaving || (!isVisible && !canEnable)}
                    onClick={save}
                >
                    {isSaving ? 'Сохраняем...' : 'Сохранить видимость'}
                </button>
            </div>
        </section>
    );
}
