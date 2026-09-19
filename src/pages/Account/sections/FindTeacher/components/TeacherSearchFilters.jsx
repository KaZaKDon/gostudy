export function TeacherSearchFilters({
    searchValue,
    onSearchChange,
    subjectId,
    subjects,
    onSubjectChange,
    accessibleOnly,
    onAccessibleOnlyChange,
}) {
    return (
        <div className="find-teacher-filters">
            <label>
                <span>Предмет</span>
                <select value={subjectId} onChange={(event) => onSubjectChange(event.target.value)}>
                    <option value="">Все предметы</option>
                    {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                </select>
            </label>
            <label>
                <span>Поиск преподавателя</span>

                <input
                    type="text"
                    value={searchValue}
                    placeholder="ФИО или направление"
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </label>
            <label className="find-teacher-filters__check">
                <input
                    type="checkbox"
                    checked={accessibleOnly}
                    onChange={(event) => onAccessibleOnlyChange(event.target.checked)}
                />
                <span>Есть места по программе «Доступное образование»</span>
            </label>
        </div>
    );
}
