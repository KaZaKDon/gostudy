import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AccountSidebar } from './components/AccountSidebar.jsx';
import { AccountPanel } from './components/AccountPanel.jsx';

import {
    STUDENT_NAVIGATION,
    TEACHER_NAVIGATION,
} from './data/accountNavigation.js';

import {
    studentDemoProfile,
    studentDemoStats,
    studentTodayLessons,
    teacherDemoProfile,
    teacherDemoStats,
    teacherTodayLessons,
} from './data/demoAccountData.js';

import './Account.css';

export function Account() {
    const [searchParams] = useSearchParams();

    const role =
        searchParams.get('role') === 'teacher'
            ? 'teacher'
            : 'student';

    const navigation =
        role === 'teacher'
            ? TEACHER_NAVIGATION
            : STUDENT_NAVIGATION;

    const profile =
        role === 'teacher'
            ? teacherDemoProfile
            : studentDemoProfile;

    const stats =
        role === 'teacher'
            ? teacherDemoStats
            : studentDemoStats;

    const todayLessons =
        role === 'teacher'
            ? teacherTodayLessons
            : studentTodayLessons;

    const [activeSection, setActiveSection] = useState('classroom');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const activeNavigationItem =
        navigation.find((item) => item.id === activeSection) ?? navigation[0];

    const handleSelectSection = (sectionId) => {
        setActiveSection(sectionId);
        setIsSidebarOpen(false);
    };

    return (
        <main
            className={
                role === 'teacher'
                    ? 'account account--teacher'
                    : 'account account--student'
            }
        >
            <button
                type="button"
                className="account-mobile-menu"
                aria-label="Открыть меню кабинета"
                onClick={() => setIsSidebarOpen(true)}
            >
                <span />
                <span />
                <span />
            </button>

            {isSidebarOpen && (
                <button
                    type="button"
                    className="account-overlay"
                    aria-label="Закрыть меню кабинета"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="account__layout">
                <AccountSidebar
                    profile={profile}
                    navigation={navigation}
                    activeSection={activeSection}
                    onSelectSection={handleSelectSection}
                    isOpen={isSidebarOpen}
                />

                <AccountPanel
                    title={activeNavigationItem.title}
                    stats={stats}
                    role={role}
                    activeSection={activeSection}
                    todayLessons={todayLessons}
                />
            </div>
        </main>
    );
}