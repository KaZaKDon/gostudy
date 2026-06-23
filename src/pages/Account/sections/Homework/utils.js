export function getHomeworkByStatus(homework = [], status) {
    return homework.filter((item) => item.status === status);
}

export function getHomeworkCount(homework = [], status) {
    return homework.filter((item) => item.status === status).length;
}