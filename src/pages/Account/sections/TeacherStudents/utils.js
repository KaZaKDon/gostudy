export function getProgressLabel(progress) {
    if (progress >= 80) return 'Хорошая динамика';
    if (progress >= 60) return 'Есть прогресс';

    return 'Нужно внимание';
}

export function getStudentInitials(name) {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2);
}

export function getFilteredStudents(students, searchValue) {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) return students;

    return students.filter((student) => {
        const searchText = [
            student.name,
            student.grade,
            student.subject,
            student.status,
        ]
            .join(' ')
            .toLowerCase();

        return searchText.includes(normalizedSearch);
    });
}