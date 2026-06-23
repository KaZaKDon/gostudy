export function getFirstJournalStudent(journal) {
    return journal[0] ?? null;
}

export function getJournalStudentById(journal, studentId) {
    return (
        journal.find((student) => student.id === studentId) ??
        getFirstJournalStudent(journal)
    );
}

export function getHomeworkLabel(hasHomework) {
    return hasHomework ? 'Да' : 'Нет';
}