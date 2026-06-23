export function getLessonCountLabel(count) {
    if (count === 0) return 'Выходной';
    if (count === 1) return '1 урок';

    if (count >= 2 && count <= 4) {
        return `${count} урока`;
    }

    return `${count} уроков`;
}