import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {
    AdminLayout,
} from './layout/AdminLayout.jsx';
import { AdminAuthProvider } from './auth/AdminAuthContext.jsx';
import { AdminProtectedRoute } from './auth/AdminProtectedRoute.jsx';

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

import {
    ReviewsPage,
} from './pages/Reviews/ReviewsPage.jsx';

import { MaterialsPage } from './pages/Materials/MaterialsPage.jsx';
import { MessagesPage } from './pages/Messages/MessagesPage.jsx';
import { ParentChildrenAdminPage } from './pages/ParentChildren/ParentChildrenAdminPage.jsx';
import { AccessibilityOffersPage } from './pages/Accessibility/AccessibilityOffersPage.jsx';
import { TariffsAdminPage } from './pages/Tariffs/TariffsAdminPage.jsx';
import { DocumentsPage } from './pages/Documents/DocumentsPage.jsx';
import { ProfileMediaPage } from './pages/ProfileMedia/ProfileMediaPage.jsx';

export function AdminApp() {
    return (
        <AdminAuthProvider>
            <Routes>
                <Route
                    path="login"
                    element={<AdminLoginPage />}
                />

                <Route element={<AdminProtectedRoute />}>
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
                            path="students/:studentId"
                            element={<StudentsPage />}
                        />

                        <Route
                            path="parent-children"
                            element={<ParentChildrenAdminPage />}
                        />

                        <Route
                            path="teachers"
                            element={<TeachersPage />}
                        />

                        <Route
                            path="teachers/:teacherId"
                            element={<TeachersPage />}
                        />

                        <Route
                            path="documents"
                            element={<DocumentsPage />}
                        />

                        <Route
                            path="profile-media"
                            element={<ProfileMediaPage />}
                        />

                        <Route
                            path="reviews"
                            element={<ReviewsPage />}
                        />

                        <Route
                            path="accessibility"
                            element={<AccessibilityOffersPage />}
                        />

                        <Route
                            path="materials"
                            element={<MaterialsPage />}
                        />

                        <Route
                            path="messages"
                            element={<MessagesPage />}
                        />

                        <Route
                            path="tariffs"
                            element={<TariffsAdminPage />}
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
                </Route>
            </Routes>
        </AdminAuthProvider>
    );
}
