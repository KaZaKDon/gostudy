import { useMemo, useState } from "react";

import { TEACHER_PROFILE_STEPS } from "./constants/wizardSteps.js";

import { StepBasic } from "./components/steps/StepBasic.jsx";
import { StepEducation } from "./components/steps/StepEducation.jsx";
import { StepPricing } from "./components/steps/StepPricing.jsx";
import { StepTeaching } from "./components/steps/StepTeaching.jsx";
import { TeacherProfileNavigation } from "./components/TeacherProfileNavigation.jsx";
import { TeacherProfileProgress } from "./components/TeacherProfileProgress.jsx";
import { TeacherProfileView } from "./components/TeacherProfileView.jsx";
import { StepAccessibility } from "./components/steps/StepAccessibility.jsx";
import { StepDocuments } from './components/steps/StepDocuments.jsx';

import "./teacher-profile.css";

function createEducationItem(isPrimary = false) {
    return {
        id: crypto.randomUUID(),
        institution: '',
        faculty: '',
        speciality: '',
        qualification: '',
        graduation_year: '',
        description: '',
        is_primary: isPrimary,
    };
}

const INITIAL_PROFILE = {
    first_name: "",
    last_name: "",
    photo_url: "",
    city: "",
    timezone: "",
    headline: "",
    about: "",

    subjects: "",
    student_levels: "",
    lesson_goals: "",
    lesson_format: "",
    experience_years: "",
    teaching_method: "",
    first_lesson_description: "",
    student_gets: "",

    education: [
        createEducationItem(true),
    ],
    certificates: "",

    price_45: "",
    price_60: "",
    price_90: "",
    trial_lesson_enabled: false,
    pricing_comment: "",
    schedule_description: "",

    accessibility_enabled: false,
    accessibility_free_lessons: false,
    accessibility_discount: false,
    accessibility_individual: false,
    accessibility_slots: "",
    accessibility_comment: "",

    diploma_file: '',
    certificate_files: '',
    intro_video_url: '',

    uses_author_materials: false,
    sells_author_materials: false,
    author_materials_description: '',
};

export function TeacherProfileWizard() {
    const [profile, setProfile] = useState(INITIAL_PROFILE);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);


    const currentStep = TEACHER_PROFILE_STEPS[currentStepIndex];
    const isPreviewStep = currentStep.id === "preview";

    const completion = useMemo(() => {
        const fields = [
            profile.first_name,
            profile.last_name,
            profile.city,
            profile.headline,
            profile.about,
            profile.subjects,
            profile.student_levels,
            profile.lesson_goals,
            profile.lesson_format,
            profile.experience_years,
            profile.teaching_method,
            profile.education.some(
                (item) =>
                    item.institution.trim() &&
                    item.speciality.trim() &&
                    item.graduation_year,
            ),
            profile.price_60,
            profile.schedule_description,
        ];

        const filled = fields.filter(Boolean).length;

        return Math.round((filled / fields.length) * 100);
    }, [profile]);

    function updateProfile(patch) {
        setProfile((current) => ({
            ...current,
            ...patch,
        }));
    }

    function goNext() {
        setCurrentStepIndex((current) =>
            Math.min(current + 1, TEACHER_PROFILE_STEPS.length - 1),
        );
    }

    function goBack() {
        setCurrentStepIndex((current) => Math.max(current - 1, 0));
    }

    function goToStep(index) {
        setCurrentStepIndex(index);
    }

    return (
        <section className="teacher-profile-page">
            <div className="teacher-profile-page__head">
                <div>
                    <p className="teacher-profile-page__eyebrow">GoStudy</p>
                    <h1>Мой профиль</h1>
                    <p>Создайте профиль, которому будут доверять будущие ученики.</p>
                </div>

                <div className="teacher-profile-page__status">
                    <span>Заполнено</span>
                    <strong>{completion}%</strong>
                </div>
            </div>

            <TeacherProfileProgress
                steps={TEACHER_PROFILE_STEPS}
                currentStepIndex={currentStepIndex}
                onStepClick={goToStep}
            />

            <div className="teacher-profile-layout teacher-profile-layout--single">
                <div className="teacher-profile-editor">
                    {currentStep.id === "basic" && (
                        <StepBasic profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === "teaching" && (
                        <StepTeaching profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === "education" && (
                        <StepEducation profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === "pricing" && (
                        <StepPricing profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === 'accessibility' && (
                        <StepAccessibility profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === 'documents' && (
                        <StepDocuments profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id !== "basic" &&
                        currentStep.id !== "teaching" &&
                        currentStep.id !== "education" &&
                        currentStep.id !== "pricing" &&
                        currentStep.id !== 'accessibility' &&
                        currentStep.id !== 'documents' &&
                        !isPreviewStep && (
                            <div className="teacher-profile-placeholder">
                                <h2>{currentStep.title}</h2>
                                <p>Этот шаг подключим следующим этапом.</p>
                            </div>
                        )}

                    {isPreviewStep && <TeacherProfileView profile={profile} />}

                    <TeacherProfileNavigation
                        isFirst={currentStepIndex === 0}
                        isLast={currentStepIndex === TEACHER_PROFILE_STEPS.length - 1}
                        onBack={goBack}
                        onNext={goNext}
                    />
                </div>
            </div>
        </section>
    );
}
