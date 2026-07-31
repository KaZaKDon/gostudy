import {
    useMemo,
    useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import {
    STUDENT_SETTINGS_TABS,
    TEACHER_SETTINGS_TABS,
} from './constants.js';

import { SettingsSidebar } from './components/SettingsSidebar.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { ParentNotificationSettings } from './components/ParentNotificationSettings.jsx';
import { AccountContactSettings } from './components/AccountContactSettings.jsx';
import { SecuritySettings } from './components/SecuritySettings.jsx';
import { NotificationSettings } from './components/NotificationSettings.jsx';
import { TeacherVisibilitySettings } from './components/TeacherVisibilitySettings.jsx';

import './SettingsSection.css';

function displayValue(value, fallback = 'Не указано') {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    return String(value);
}

function getStudentSection(activeTab, user, profile) {
    if (activeTab === 'profile') {
        return {
            title: 'Профиль ученика',
            fields: [
                {
                    label: 'Фамилия',
                    value: displayValue(profile?.last_name, 'Не указана'),
                },
                {
                    label: 'Имя',
                    value: displayValue(profile?.first_name),
                },
                {
                    label: 'Год рождения',
                    value: displayValue(profile?.birth_year, 'Не указан'),
                },
                {
                    label: 'Город',
                    value: displayValue(profile?.city, 'Не указан'),
                },
                {
                    label: 'Класс / уровень',
                    value: displayValue(profile?.class_level, 'Не указан'),
                },
                {
                    label: 'Часовой пояс',
                    value: displayValue(profile?.timezone, 'Не указан'),
                },
                {
                    label: 'Предметы',
                    value: displayValue(profile?.subjects, 'Не указаны'),
                },
                {
                    label: 'Цель обучения',
                    value: displayValue(
                        profile?.learning_goals || profile?.goal,
                        'Не указана',
                    ),
                },
                {
                    label: 'Формат занятий',
                    value: displayValue(
                        profile?.lesson_format,
                        'Не указан',
                    ),
                },
                {
                    label: 'Предпочтительное время',
                    value: displayValue(
                        profile?.preferred_time,
                        'Не указано',
                    ),
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
                    label: 'Email аккаунта',
                    value: displayValue(user?.email, 'Не указан'),
                },
                {
                    label: 'Телефон ученика',
                    value: displayValue(user?.phone, 'Не указан'),
                },
                {
                    label: 'Мессенджер',
                    value: displayValue(profile?.messenger, 'Не указан'),
                },
                {
                    label: 'Предпочтительный способ связи',
                    value: displayValue(
                        profile?.contact_preference,
                        'Не указан',
                    ),
                },
                {
                    label: 'Имя родителя',
                    value: displayValue(profile?.parent_name, 'Не указано'),
                },
                {
                    label: 'Телефон родителя',
                    value: displayValue(profile?.parent_phone, 'Не указан'),
                },
                {
                    label: 'Email родителя',
                    value: displayValue(profile?.parent_email, 'Не указан'),
                },
            ],
            actionLabel: 'Редактировать контакты',
            actionType: 'edit-contacts',
        };
    }

    return null;
}

function getTeacherProfileSection(profile, subjects) {
    const subjectNames = (subjects || [])
        .map((subject) => subject.name)
        .filter(Boolean)
        .join(', ');

    return {
        title: 'Профиль преподавателя',
        fields: [
            {
                label: 'Фамилия',
                value: displayValue(profile?.last_name, 'Не указана'),
            },
            {
                label: 'Имя',
                value: displayValue(profile?.first_name),
            },
            {
                label: 'Город',
                value: displayValue(profile?.city, 'Не указан'),
            },
            {
                label: 'Часовой пояс',
                value: displayValue(profile?.timezone, 'Не указан'),
            },
            {
                label: 'Опыт преподавания',
                value: profile?.experience_years === null
                    || profile?.experience_years === undefined
                    ? 'Не указан'
                    : `${profile.experience_years} лет`,
            },
            {
                label: 'Предметы',
                value: subjectNames || 'Не указаны',
            },
        ],
        actionLabel: 'Редактировать анкету',
        actionType: 'edit-profile',
    };
}

export function SettingsSection({
    role,
    user,
    profile,
    subjects = [],
    documents = [],
}) {
    const navigate = useNavigate();

    const tabs = role === 'teacher'
        ? TEACHER_SETTINGS_TABS
        : STUDENT_SETTINGS_TABS;

    const [activeTab, setActiveTab] = useState(tabs[0].id);

    const activeSection = useMemo(() => {
        if (role === 'student') {
            return getStudentSection(activeTab, user, profile);
        }

        if (activeTab === 'profile') {
            return getTeacherProfileSection(profile, subjects);
        }

        if (activeTab === 'documents') {
            return {
                title: 'Документы',
                type: 'documents',
                actionType: 'edit-documents',
            };
        }

        if (activeTab === 'payouts') {
            return {
                title: 'Платёжные данные',
                type: 'payouts',
            };
        }

        return null;
    }, [activeTab, profile, role, subjects, user]);

    const handleAction = () => {
        if (activeSection?.actionType === 'edit-profile') {
            navigate(`/profile-start?role=${role}&mode=edit`);
        }

        if (activeSection?.actionType === 'edit-contacts') {
            navigate('/profile-start?role=student&mode=edit&step=contacts');
        }

        if (activeSection?.actionType === 'edit-documents') {
            navigate('/profile-start?role=teacher&mode=edit&step=documents');
        }
    };

    const renderPanel = () => {
        if (activeTab === 'contacts') {
            return role === 'teacher'
                ? <AccountContactSettings user={user} />
                : (
                    <SettingsPanel
                        section={activeSection}
                        onAction={handleAction}
                    />
                );
        }

        if (activeTab === 'security') {
            return <SecuritySettings />;
        }

        if (activeTab === 'notifications') {
            return role === 'student'
                ? (
                    <ParentNotificationSettings
                        onEditContacts={() => navigate(
                            '/profile-start?role=student&mode=edit&step=contacts',
                        )}
                    />
                )
                : <NotificationSettings role={role} />;
        }

        if (role === 'teacher' && activeTab === 'publicProfile') {
            return <TeacherVisibilitySettings profile={profile} />;
        }

        return (
            <SettingsPanel
                section={activeSection}
                documents={documents}
                profile={profile}
                onAction={handleAction}
            />
        );
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

                {renderPanel()}
            </div>
        </section>
    );
}
