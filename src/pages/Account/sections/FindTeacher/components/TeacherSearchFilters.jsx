export function TeacherSearchFilters({
    searchValue,
    onSearchChange,
}) {
    return (
        <div className="find-teacher-filters">
            <label>
                <span>Поиск преподавателя</span>

                <input
                    type="text"
                    value={searchValue}
                    placeholder="ФИО, предмет или направление"
                    onChange={(event) => onSearchChange(event.target.value)}
                />
            </label>
        </div>
    );
}