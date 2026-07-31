import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import {
    API,
    getAuthHeaders,
} from '../../api/api.js';
import {
    formatFileSize,
    uploadFile,
} from '../../api/upload.js';
import { TEACHER_PROFILE_STEPS } from './constants/wizardSteps.js';

import { StepBasic } from './components/steps/StepBasic.jsx';
import { StepEducation } from './components/steps/StepEducation.jsx';
import { StepPricing } from './components/steps/StepPricing.jsx';
import { StepTeaching } from './components/steps/StepTeaching.jsx';
import { TeacherProfileNavigation } from './components/TeacherProfileNavigation.jsx';
import { TeacherProfileProgress } from './components/TeacherProfileProgress.jsx';
import { TeacherProfileView } from './components/TeacherProfileView.jsx';
import { StepAccessibility } from './components/steps/StepAccessibility.jsx';
import { StepDocuments } from './components/steps/StepDocuments.jsx';

import './teacher-profile.css';

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
    first_name: '',
    last_name: '',
    photo_url: '',
    city: '',
    timezone: '',
    headline: '',
    about: '',

    subject_ids: [],
    subject_preparations: [],
    age_group_ids: [],
    experience_years: '',
    teaching_method: '',
    first_lesson_description: '',
    student_gets: '',

    education: [createEducationItem(true)],

    price_45: '',
    price_60: '',
    price_90: '',
    trial_lesson_enabled: false,
    pricing_comment: '',
    schedule_description: '',

    accessibility_enabled: false,
    accessibility_free_lessons: false,
    accessibility_discount: false,
    accessibility_individual: false,
    accessibility_slots: '',
    accessibility_comment: '',

    intro_video_url: '',

    uses_author_materials: false,
    sells_author_materials: false,
    author_materials_description: '',
};

function stringValue(value) {
    return value === null || value === undefined
        ? ''
        : String(value);
}

function mapEducation(education) {
    if (!Array.isArray(education) || education.length === 0) {
        return [createEducationItem(true)];
    }

    return education.map((item) => ({
        id: Number(item.id),
        institution: stringValue(item.institution),
        faculty: stringValue(item.faculty),
        speciality: stringValue(item.speciality),
        qualification: stringValue(item.qualification),
        graduation_year: stringValue(item.graduation_year),
        description: stringValue(item.description),
        is_primary: Boolean(Number(item.is_primary)),
    }));
}

function mapProfileFromApi(result) {
    const apiProfile = result.profile || {};

    return {
        ...INITIAL_PROFILE,
        first_name: stringValue(apiProfile.first_name),
        last_name: stringValue(apiProfile.last_name),
        photo_url: stringValue(apiProfile.photo_url),
        city: stringValue(apiProfile.city),
        timezone: stringValue(apiProfile.timezone),
        headline: stringValue(apiProfile.headline),
        about: stringValue(apiProfile.about),
        subject_ids: Array.isArray(result.subject_ids)
            ? result.subject_ids.map(Number)
            : [],
        subject_preparations: Array.isArray(result.subject_preparations)
            ? result.subject_preparations.map((item) => ({
                subject_id: Number(item.subject_id),
                preparation_ids: Array.isArray(item.preparation_ids)
                    ? item.preparation_ids.map(Number)
                    : [],
            }))
            : [],
        age_group_ids: Array.isArray(result.age_group_ids)
            ? result.age_group_ids.map(Number)
            : [],
        experience_years: stringValue(apiProfile.experience_years),
        teaching_method: stringValue(apiProfile.teaching_method),
        first_lesson_description: stringValue(apiProfile.first_lesson_description),
        student_gets: stringValue(apiProfile.student_gets),
        education: mapEducation(result.education),
        price_45: stringValue(apiProfile.price_45),
        price_60: stringValue(apiProfile.price_60),
        price_90: stringValue(apiProfile.price_90),
        trial_lesson_enabled: Boolean(Number(apiProfile.trial_lesson_enabled)),
        pricing_comment: stringValue(apiProfile.pricing_comment),
        schedule_description: stringValue(apiProfile.schedule_description),
        accessibility_enabled: Boolean(Number(apiProfile.accessibility_enabled)),
        accessibility_free_lessons: Boolean(Number(apiProfile.accessibility_free_lessons)),
        accessibility_discount: Boolean(Number(apiProfile.accessibility_discount)),
        accessibility_individual: Boolean(Number(apiProfile.accessibility_individual)),
        accessibility_slots: stringValue(apiProfile.accessibility_slots),
        accessibility_comment: stringValue(apiProfile.accessibility_comment),
        intro_video_url: stringValue(apiProfile.intro_video_url),
        uses_author_materials: Boolean(Number(apiProfile.uses_author_materials)),
        sells_author_materials: Boolean(Number(apiProfile.sells_author_materials)),
        author_materials_description: stringValue(apiProfile.author_materials_description),
    };
}

async function readJsonResponse(response, fallbackMessage) {
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
        throw new Error(result?.message || fallbackMessage);
    }

    return result;
}

export function TeacherProfileWizard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedStep = searchParams.get('step');
    const initialStepIndex = Math.max(
        0,
        TEACHER_PROFILE_STEPS.findIndex(
            (step) => step.id === requestedStep,
        ),
    );
    const isEditMode = searchParams.get('mode') === 'edit';
    const [profile, setProfile] = useState(INITIAL_PROFILE);
    const [options, setOptions] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoProgress, setPhotoProgress] = useState(0);
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);
    const [documentProgress, setDocumentProgress] = useState(0);
    const [deletingDocumentId, setDeletingDocumentId] = useState(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const currentStep = TEACHER_PROFILE_STEPS[currentStepIndex];
    const isPreviewStep = currentStep.id === 'preview';
    const isFileOperationInProgress = isUploadingPhoto
        || isUploadingDocument
        || isUploadingVideo
        || deletingDocumentId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            setIsLoading(true);
            setErrorMessage('');

            try {
                const [profileResponse, optionsResponse] = await Promise.all([
                    fetch(API.me, {
                        method: 'GET',
                        headers: getAuthHeaders(),
                    }),
                    fetch(API.teacherOptions, {
                        method: 'GET',
                        headers: getAuthHeaders(),
                    }),
                ]);

                const [profileResult, optionsResult] = await Promise.all([
                    readJsonResponse(profileResponse, 'Не удалось загрузить анкету'),
                    readJsonResponse(optionsResponse, 'Не удалось загрузить справочники'),
                ]);

                if (!isMounted) {
                    return;
                }

                if (profileResult.user?.role !== 'teacher') {
                    throw new Error('Анкета доступна только преподавателю');
                }

                setProfile(mapProfileFromApi(profileResult));
                setDocuments(
                    Array.isArray(profileResult.documents)
                        ? profileResult.documents
                        : [],
                );
                setOptions({
                    subject_groups: optionsResult.subject_groups || [],
                    age_groups: optionsResult.age_groups || [],
                    upload_limits: optionsResult.upload_limits || {},
                });
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Не удалось загрузить анкету',
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    const completion = useMemo(() => {
        const educationCompleted = profile.education.some(
            (item) => item.institution.trim() && item.speciality.trim(),
        );
        const hasPrice = [
            profile.price_45,
            profile.price_60,
            profile.price_90,
        ].some((value) => Number(value) > 0);
        const fields = [
            profile.first_name.trim(),
            profile.last_name.trim(),
            profile.city.trim(),
            profile.headline.trim(),
            profile.about.trim(),
            profile.subject_ids.length > 0,
            profile.age_group_ids.length > 0,
            profile.experience_years !== '',
            profile.teaching_method.trim(),
            educationCompleted,
            hasPrice,
            profile.schedule_description.trim(),
        ];
        const filled = fields.filter(Boolean).length;

        return Math.round((filled / fields.length) * 100);
    }, [profile]);

    function updateProfile(patch) {
        setProfile((current) => ({
            ...current,
            ...patch,
        }));
        setErrorMessage('');
    }

    function updateStoredUser(patch) {
        try {
            const storedUser = JSON.parse(
                sessionStorage.getItem('gostudy_user') || 'null',
            );

            if (storedUser) {
                sessionStorage.setItem(
                    'gostudy_user',
                    JSON.stringify({
                        ...storedUser,
                        ...patch,
                    }),
                );
            }
        } catch {
            // Повреждённое локальное значение обновится при следующей авторизации.
        }
    }

    async function handlePhotoSelect(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxBytes = Number(options?.upload_limits?.photo_max_bytes)
            || 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type) || file.size > maxBytes) {
            setErrorMessage(
                `Фото должно быть в формате JPG, PNG или WebP и весить не более ${formatFileSize(maxBytes)}.`,
            );
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoProgress(0);
        setErrorMessage('');

        try {
            const result = await uploadFile({
                url: API.uploadTeacherPhoto,
                file,
                onProgress: setPhotoProgress,
            });

            updateProfile({
                photo_url: result.photo_url,
            });
            updateStoredUser({
                avatar_url: result.photo_url,
            });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить фото',
            );
        } finally {
            setIsUploadingPhoto(false);
            setPhotoProgress(0);
        }
    }

    async function handleDeletePhoto() {
        if (!window.confirm('Удалить фото профиля?')) {
            return;
        }

        setIsUploadingPhoto(true);
        setErrorMessage('');

        try {
            const response = await fetch(API.deleteTeacherMedia, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ type: 'photo' }),
            });

            await readJsonResponse(response, 'Не удалось удалить фото');
            updateProfile({ photo_url: '' });
            updateStoredUser({ avatar_url: null });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось удалить фото',
            );
        } finally {
            setIsUploadingPhoto(false);
        }
    }

    async function handleDocumentSelect(files, type) {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
        ];
        const maxBytes = Number(options?.upload_limits?.document_max_bytes)
            || 10 * 1024 * 1024;
        const invalidFile = files.find(
            (file) => !allowedTypes.includes(file.type) || file.size > maxBytes,
        );

        if (invalidFile) {
            setErrorMessage(
                `Файл «${invalidFile.name}» должен быть PDF, JPG, PNG или WebP размером до ${formatFileSize(maxBytes)}.`,
            );
            return;
        }

        setIsUploadingDocument(true);
        setDocumentProgress(0);
        setErrorMessage('');

        try {
            const primaryEducation = profile.education.find(
                (item) => item.is_primary,
            );
            const primaryEducationId = Number(primaryEducation?.id);
            const documentFields = type === 'diploma'
                ? {
                    type,
                    education_id: Number.isInteger(primaryEducationId)
                        ? primaryEducationId
                        : '',
                    institution: primaryEducation?.institution || '',
                    document_year: primaryEducation?.graduation_year || '',
                }
                : { type };

            for (let index = 0; index < files.length; index += 1) {
                const result = await uploadFile({
                    url: API.uploadTeacherDocument,
                    file: files[index],
                    fields: documentFields,
                    onProgress: (progress) => {
                        const totalProgress = Math.round(
                            ((index + (progress / 100)) / files.length) * 100,
                        );
                        setDocumentProgress(totalProgress);
                    },
                });

                setDocuments((current) => [
                    ...current,
                    result.document,
                ]);
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить документ',
            );
        } finally {
            setIsUploadingDocument(false);
            setDocumentProgress(0);
        }
    }

    async function handleDeleteDocument(documentId) {
        if (!window.confirm('Удалить выбранный документ?')) {
            return;
        }

        setDeletingDocumentId(documentId);
        setErrorMessage('');

        try {
            const response = await fetch(API.deleteTeacherDocument, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ document_id: documentId }),
            });

            await readJsonResponse(response, 'Не удалось удалить документ');
            setDocuments((current) => current.filter(
                (document) => Number(document.id) !== Number(documentId),
            ));
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось удалить документ',
            );
        } finally {
            setDeletingDocumentId(null);
        }
    }

    async function handleVideoSelect(file) {
        const allowedTypes = ['video/mp4', 'video/webm'];
        const maxBytes = Number(options?.upload_limits?.video_max_bytes)
            || 100 * 1024 * 1024;

        if (!allowedTypes.includes(file.type) || file.size > maxBytes) {
            setErrorMessage(
                `Видео должно быть в формате MP4 или WebM и весить не более ${formatFileSize(maxBytes)}.`,
            );
            return;
        }

        setIsUploadingVideo(true);
        setVideoProgress(0);
        setErrorMessage('');

        try {
            const result = await uploadFile({
                url: API.uploadTeacherVideo,
                file,
                onProgress: setVideoProgress,
            });

            updateProfile({
                intro_video_url: result.intro_video_url,
            });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить видеовизитку',
            );
        } finally {
            setIsUploadingVideo(false);
            setVideoProgress(0);
        }
    }

    async function handleDeleteVideo() {
        if (!window.confirm('Удалить видеовизитку?')) {
            return;
        }

        setIsUploadingVideo(true);
        setErrorMessage('');

        try {
            const response = await fetch(API.deleteTeacherMedia, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ type: 'video' }),
            });

            await readJsonResponse(response, 'Не удалось удалить видеовизитку');
            updateProfile({ intro_video_url: '' });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось удалить видеовизитку',
            );
        } finally {
            setIsUploadingVideo(false);
        }
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
        if (!isSaving && !isFileOperationInProgress) {
            setCurrentStepIndex(index);
        }
    }

    function validateProfile() {
        if (!profile.first_name.trim() || !profile.last_name.trim()) {
            setCurrentStepIndex(0);
            return 'Укажите имя и фамилию преподавателя.';
        }

        if (!profile.city.trim() || !profile.headline.trim() || !profile.about.trim()) {
            setCurrentStepIndex(0);
            return 'Заполните город, короткий заголовок и рассказ о себе.';
        }

        if (profile.subject_ids.length === 0) {
            setCurrentStepIndex(1);
            return 'Выберите хотя бы один предмет.';
        }

        if (profile.age_group_ids.length === 0) {
            setCurrentStepIndex(1);
            return 'Выберите хотя бы одну возрастную группу.';
        }

        const experienceYears = Number(profile.experience_years);

        if (
            profile.experience_years === ''
            || !Number.isInteger(experienceYears)
            || experienceYears < 0
            || experienceYears > 80
        ) {
            setCurrentStepIndex(1);
            return 'Укажите опыт преподавания от 0 до 80 лет.';
        }

        if (!profile.teaching_method.trim()) {
            setCurrentStepIndex(1);
            return 'Опишите, как проходят занятия.';
        }

        const hasEducation = profile.education.some(
            (item) => item.institution.trim(),
        );

        if (!hasEducation) {
            setCurrentStepIndex(2);
            return 'Добавьте хотя бы одну запись об образовании.';
        }

        const hasPrice = [
            profile.price_45,
            profile.price_60,
            profile.price_90,
        ].some((value) => Number(value) > 0);

        if (!hasPrice || !profile.schedule_description.trim()) {
            setCurrentStepIndex(3);
            return 'Укажите стоимость хотя бы одного занятия и расписание.';
        }

        return '';
    }

    async function saveProfile() {
        if (isFileOperationInProgress) {
            setErrorMessage('Дождитесь завершения загрузки файлов.');
            return;
        }

        const validationMessage = validateProfile();

        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const response = await fetch(API.updateTeacher, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...profile,
                    experience_years: Number(profile.experience_years),
                }),
            });
            const result = await readJsonResponse(
                response,
                'Не удалось сохранить анкету',
            );

            sessionStorage.setItem(
                'gostudy_user',
                JSON.stringify(result.user),
            );

            navigate(
                isEditMode
                    ? '/account?section=settings'
                    : '/account',
                {
                replace: true,
                },
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось сохранить анкету',
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="teacher-profile-message">
                Загружаем анкету и справочники...
            </div>
        );
    }

    if (!options) {
        return (
            <div className="teacher-profile-message teacher-profile-message--error">
                {errorMessage || 'Не удалось загрузить анкету.'}
            </div>
        );
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

            {errorMessage && (
                <div className="teacher-profile-message teacher-profile-message--error">
                    {errorMessage}
                </div>
            )}

            <div className="teacher-profile-layout teacher-profile-layout--single">
                <div className="teacher-profile-editor">
                    {currentStep.id === 'basic' && (
                        <StepBasic
                            profile={profile}
                            onChange={updateProfile}
                            photoMaxBytes={options.upload_limits?.photo_max_bytes}
                            isUploadingPhoto={isUploadingPhoto}
                            photoProgress={photoProgress}
                            onPhotoSelect={handlePhotoSelect}
                            onDeletePhoto={handleDeletePhoto}
                        />
                    )}

                    {currentStep.id === 'teaching' && (
                        <StepTeaching
                            profile={profile}
                            options={options}
                            onChange={updateProfile}
                        />
                    )}

                    {currentStep.id === 'education' && (
                        <StepEducation profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === 'pricing' && (
                        <StepPricing profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === 'accessibility' && (
                        <StepAccessibility profile={profile} onChange={updateProfile} />
                    )}

                    {currentStep.id === 'documents' && (
                        <StepDocuments
                            profile={profile}
                            documents={documents}
                            isUploadingDocument={isUploadingDocument}
                            documentProgress={documentProgress}
                            deletingDocumentId={deletingDocumentId}
                            isUploadingVideo={isUploadingVideo}
                            videoProgress={videoProgress}
                            documentMaxBytes={options.upload_limits?.document_max_bytes}
                            videoMaxBytes={options.upload_limits?.video_max_bytes}
                            onDocumentSelect={handleDocumentSelect}
                            onDeleteDocument={handleDeleteDocument}
                            onVideoSelect={handleVideoSelect}
                            onDeleteVideo={handleDeleteVideo}
                        />
                    )}

                    {isPreviewStep && (
                        <TeacherProfileView profile={profile} options={options} />
                    )}

                    <TeacherProfileNavigation
                        isFirst={currentStepIndex === 0}
                        isLast={currentStepIndex === TEACHER_PROFILE_STEPS.length - 1}
                        isSaving={isSaving}
                        isDisabled={isFileOperationInProgress}
                        onBack={goBack}
                        onNext={goNext}
                        onSave={saveProfile}
                    />
                </div>
            </div>
        </section>
    );
}
