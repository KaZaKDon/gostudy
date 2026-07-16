import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {
    AdminLayout,
} from './layout/AdminLayout.jsx';

import {
    AccountsPage,
} from './pages/Accounts/AccountsPage.jsx';

import {
    AdminDashboardPage,
} from './pages/Dashboard/AdminDashboardPage.jsx';

import {
    AgeGroupsPage,
} from './pages/Dictionaries/AgeGroups/AgeGroupsPage.jsx';

import {
    PreparationGroupsPage,
} from './pages/Dictionaries/PreparationGroups/PreparationGroupsPage.jsx';

import {
    PreparationsPage,
} from './pages/Dictionaries/Preparations/PreparationsPage.jsx';

import {
    SubjectGroupsPage,
} from './pages/Dictionaries/SubjectGroups/SubjectGroupsPage.jsx';

import {
    SubjectPreparationsPage,
} from './pages/Dictionaries/SubjectPreparations/SubjectPreparationsPage.jsx';

import {
    SubjectsPage,
} from './pages/Dictionaries/Subjects/SubjectsPage.jsx';

import {
    AdminLoginPage,
} from './pages/Login/AdminLoginPage.jsx';

import {
    StudentsPage,
} from './pages/Students/StudentsPage.jsx';

import {
    TeachersPage,
} from './pages/Teachers/TeachersPage.jsx';

export function AdminApp() {
    return (
        <Routes>
            <Route
                path="login"
                element={<AdminLoginPage />}
            />

            <Route element={<AdminLayout />}>
                <Route
                    index
                    element={(
                        <Navigate
                            to="dashboard"
                            replace
                        />
                    )}
                />

                <Route
                    path="dashboard"
                    element={<AdminDashboardPage />}
                />

                <Route
                    path="accounts"
                    element={<AccountsPage />}
                />

                <Route
                    path="students"
                    element={<StudentsPage />}
                />

                <Route
                    path="teachers"
                    element={<TeachersPage />}
                />

                <Route
                    path="dictionaries/subject-groups"
                    element={<SubjectGroupsPage />}
                />

                <Route
                    path="dictionaries/subjects"
                    element={<SubjectsPage />}
                />

                <Route
                    path="dictionaries/preparation-groups"
                    element={<PreparationGroupsPage />}
                />

                <Route
                    path="dictionaries/preparations"
                    element={<PreparationsPage />}
                />

                <Route
                    path="dictionaries/age-groups"
                    element={<AgeGroupsPage />}
                />

                <Route
                    path="dictionaries/subject-preparations"
                    element={<SubjectPreparationsPage />}
                />
            </Route>
        </Routes>
    );
}