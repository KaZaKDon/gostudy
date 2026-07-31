import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

import { mapTeacherStudent } from './utils.js';

const EMPTY_STUDENTS = {
    active: [],
    requests: [],
    archive: [],
};

async function fetchTeacherStudents(signal) {
    const result = await apiRequest(API.teacherStudents, {
        signal,
    });

    const loadedStudents = result.students || {};

    return {
        active: Array.isArray(loadedStudents.active)
            ? loadedStudents.active.map((student) =>
                mapTeacherStudent(student, 'active'),
            )
            : [],
        requests: Array.isArray(loadedStudents.requests)
            ? loadedStudents.requests.map((student) =>
                mapTeacherStudent(student, 'requests'),
            )
            : [],
        archive: Array.isArray(loadedStudents.archive)
            ? loadedStudents.archive.map((student) =>
                mapTeacherStudent(student, 'archive'),
            )
            : [],
    };
}

export function useTeacherStudents() {
    const [students, setStudents] = useState(EMPTY_STUDENTS);
    const [requestStatus, setRequestStatus] = useState('loading');
    const [actionStatus, setActionStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadStudents() {
            try {
                const loadedStudents = await fetchTeacherStudents(
                    controller.signal,
                );

                setStudents(loadedStudents);
                setRequestStatus('success');
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить учеников',
                );
                setRequestStatus('error');
            }
        }

        loadStudents();

        return () => controller.abort();
    }, []);

    const respondToRequest = useCallback(
        async (requestId, action) => {
            setActionStatus('loading');
            setErrorMessage('');

            try {
                await apiRequest(API.respondStudentRequest, {
                    method: 'POST',
                    body: {
                        request_id: requestId,
                        action,
                    },
                });

                const loadedStudents = await fetchTeacherStudents();

                setStudents(loadedStudents);
                setActionStatus('success');
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось обработать заявку',
                );
                setActionStatus('error');
                throw error;
            }
        },
        [],
    );

    const updateStudentStatus = useCallback(
        async (relationId, action) => {
            setActionStatus('loading');
            setErrorMessage('');

            try {
                await apiRequest(API.updateTeacherStudentStatus, {
                    method: 'POST',
                    body: {
                        relation_id: relationId,
                        action,
                    },
                });

                const loadedStudents = await fetchTeacherStudents();

                setStudents(loadedStudents);
                setActionStatus('success');
                window.dispatchEvent(
                    new Event('gostudy:notifications-refresh'),
                );
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось изменить статус обучения',
                );
                setActionStatus('error');
                throw error;
            }
        },
        [],
    );

    return {
        students,
        requestStatus,
        actionStatus,
        errorMessage,
        respondToRequest,
        updateStudentStatus,
    };
}
