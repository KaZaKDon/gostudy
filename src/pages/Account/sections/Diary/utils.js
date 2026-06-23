export function getFirstDiarySubject(
    diary,
) {
    return diary[0] ?? null;
}

export function getDiarySubjectById(
    diary,
    subjectId,
) {
    return (
        diary.find(
            (subject) =>
                subject.id === subjectId,
        ) ?? diary[0]
    );
}

export function getTotalLessons(
    diary,
) {
    return diary.reduce(
        (total, subject) =>
            total +
            subject.lessons.length,
        0,
    );
}

export function getAverageGrade(
    diary,
) {
    const grades = [];

    diary.forEach((subject) => {
        subject.lessons.forEach(
            (lesson) => {
                const grade = Number(
                    lesson.grade,
                );

                if (
                    !Number.isNaN(grade)
                ) {
                    grades.push(grade);
                }
            },
        );
    });

    if (!grades.length) {
        return '—';
    }

    const average =
        grades.reduce(
            (sum, grade) =>
                sum + grade,
            0,
        ) / grades.length;

    return average.toFixed(1);
}