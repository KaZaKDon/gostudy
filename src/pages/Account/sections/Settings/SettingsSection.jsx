import { useState } from 'react';

import {
    SETTINGS_CONTENT,
    STUDENT_SETTINGS_TABS,
    TEACHER_SETTINGS_TABS,
} from './constants.js';

import { SettingsSidebar } from './components/SettingsSidebar.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';

import './SettingsSection.css';

export function SettingsSection({ role }) {
    const tabs =
        role === 'teacher'
            ? TEACHER_SETTINGS_TABS
            : STUDENT_SETTINGS_TABS;

    const [activeTab, setActiveTab] = useState(tabs[0].id);

    const activeSection = SETTINGS_CONTENT[activeTab];

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

                <SettingsPanel section={activeSection} />
            </div>
        </section>
    );
}