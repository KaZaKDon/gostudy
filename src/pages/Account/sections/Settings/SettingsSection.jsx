import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    SETTINGS_CONTENT,
    STUDENT_SETTINGS_TABS,
    TEACHER_SETTINGS_TABS,
} from './constants.js';

import { SettingsSidebar } from './components/SettingsSidebar.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';

import './SettingsSection.css';

function getStudentSection(activeTab, user, profile) {
    if (activeTab === 'profile') {
        return {
            title: 'Профиль ученика',
            fields: [
                {
                    label: 'Фамилия',
                    value: profile?.last_name || 'Не указана',
                },
                {
                    label: 'Имя',
                    value: profile?.first_name || 'Не указано',
                },
                {
                    label: 'Год рождения',
                    value: profile?.birth_year || 'Не указан',
                },
                {
                    label: 'Город',
                    value: profile?.city || 'Не указан',
                },
                {
                    label: 'Класс / уровень',
                    value: profile?.class_level || 'Не указан',
                },
                {
                    label: 'Часовой пояс',
                    value: profile?.timezone || 'Не указан',
                },
            ],
            actionLabel: 'Редактировать анкету',
            actionType: 'edit-profile',
        };
    }

    if (activeTab === 'contacts') {
        return {
            title: 'Контакты',
            fields: [
                {
                    label: 'Телефон ученика',
                    value: user?.phone || 'Не указан',
                },
                {
                    label: 'Email',
                    value: user?.email || 'Не указан',
                },
                {
                    label: 'Мессенджер',
                    value: profile?.messenger || 'Не указан',
                },
                {
                    label: 'Предпочтительный способ связи',
                    value: profile?.contact_preference || 'Не указан',
                },
                {
                    label: 'Имя родителя',
                    value: profile?.parent_name || 'Не указано',
                },
                {
                    label: 'Телефон родителя',
                    value: profile?.parent_phone || 'Не указан',
                },
                {
                    label: 'Email родителя',
                    value: profile?.parent_email || 'Не указан',
                },
            ],
            actionLabel: 'Редактировать анкету',
            actionType: 'edit-profile',
        };
    }

    return SETTINGS_CONTENT[activeTab];
}

export function SettingsSection({
    role,
    user,
    profile,
}) {
    const navigate = useNavigate();

    const tabs =
        role === 'teacher'
            ? TEACHER_SETTINGS_TABS
            : STUDENT_SETTINGS_TABS;

    const [activeTab, setActiveTab] = useState(tabs[0].id);

    const activeSection = useMemo(() => {
        if (role === 'student') {
            return getStudentSection(activeTab, user, profile);
        }

        return SETTINGS_CONTENT[activeTab];
    }, [activeTab, profile, role, user]);

    const handleAction = () => {
        if (activeSection?.actionType === 'edit-profile') {
            navigate('/profile-start?role=student&mode=edit');
        }
    };

    return (
        <section className="settings-section">
            <header className="settings-section__header">
                <div>
                    <span>Настройки</span>
                    <h2>Параметры аккаунта</h2>
                </div>
            </header>

            <div className="settings-section__layout">
                <SettingsSidebar
                    tabs={tabs}
                    activeTab={activeTab}
                    onChangeTab={setActiveTab}
                />

                <SettingsPanel
                    section={activeSection}
                    onAction={handleAction}
                />
            </div>
        </section>
    );
}