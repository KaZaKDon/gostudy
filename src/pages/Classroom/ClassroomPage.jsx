import { useMemo, useState } from 'react';
import {
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom';

import { ClassroomHeader } from './components/ClassroomHeader.jsx';
import { ClassroomChat } from './components/ClassroomChat.jsx';
import { ClassroomSidePanel } from './components/ClassroomSidePanel.jsx';
import { ClassroomWorkspace } from './components/ClassroomWorkspace.jsx';
import { ClassroomTools } from './components/ClassroomTools.jsx';
import { FinishLessonModal } from './components/FinishLessonModal.jsx';

import {
    classroomFallbackLesson,
    classroomHomework,
    classroomMaterials,
    classroomMessages,
} from './data/classroomDemoData.js';

import './ClassroomPage.css';

export function ClassroomPage() {
    const { lessonId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [activeTool, setActiveTool] = useState('video');
    const [activePanel, setActivePanel] = useState('materials');
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

    const role = location.state?.role === 'teacher' ? 'teacher' : 'student';

    const lesson = useMemo(() => {
        return location.state?.lesson ?? {
            ...classroomFallbackLesson,
            id: lessonId,
        };
    }, [lessonId, location.state?.lesson]);

    const handleBackToAccount = () => {
        navigate(`/account?role=${role}`);
    };

    const handleFinishLesson = () => {
        setIsFinishModalOpen(true);
    };

    const handleSaveFinish = () => {
        setIsFinishModalOpen(false);
        navigate(`/account?role=${role}`);
    };

    return (
        <main className="classroom-page">
            <ClassroomHeader
                lesson={lesson}
                role={role}
                onBack={handleBackToAccount}
                onFinish={handleFinishLesson}
            />

            <section className="classroom-page__layout">
                <aside className="classroom-page__side">
                    <ClassroomChat messages={classroomMessages} />

                    <ClassroomSidePanel
                        role={role}
                        activePanel={activePanel}
                        materials={classroomMaterials}
                        homework={classroomHomework}
                        onChangePanel={setActivePanel}
                    />
                </aside>

                <section className="classroom-page__main">
                    <ClassroomWorkspace
                        activeTool={activeTool}
                        lesson={lesson}
                    />

                    <ClassroomTools
                        activeTool={activeTool}
                        onChangeTool={setActiveTool}
                    />
                </section>
            </section>

            {isFinishModalOpen && (
                <FinishLessonModal
                    role={role}
                    onClose={() => setIsFinishModalOpen(false)}
                    onSave={handleSaveFinish}
                />
            )}
        </main>
    );
}