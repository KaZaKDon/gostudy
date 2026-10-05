import {
    hasTeacherDirectoryFilters,
    preparationsForSubject,
} from '../teacherDirectoryFilters.js';

export function TeacherSearchFilters({
    filters,
    options,
    onChange,
    onReset,
}) {
    const preparations = preparationsForSubject(
        options.preparations,
        filters.subjectId,
    );

    return (
        <div className="find-teacher-filters">
            <label>
                <span>Предмет</span>
                <select
                    value={filters.subjectId}
                    onChange={(event) => onChange('subjectId', event.target.value)}
                >
                    <option value="">Все предметы</option>
                    {options.subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                </select>
            </label>
            <label>
                <span>Поиск преподавателя</span>

                <input
                    type="text"
                    value={filters.search}
                    placeholder="ФИО или направление"
                    onChange={(event) => onChange('search', event.target.value)}
                />
            </label>

            <section
                className="find-teacher-filters__advanced"
                aria-labelledby="teacher-advanced-filters-title"
            >
                <h3 id="teacher-advanced-filters-title">
                    Расширенные фильтры
                </h3>

                <div className="find-teacher-filters__advanced-grid">
                    <label>
                        <span>Направление подготовки</span>
                        <select
                            value={filters.preparationId}
                            onChange={(event) => onChange(
                                'preparationId',
                                event.target.value,
                            )}
                        >
                            <option value="">Все направления</option>
                            {preparations.map((preparation) => (
                                <option
                                    key={preparation.id}
                                    value={preparation.id}
                                >
                                    {preparation.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Возраст ученика</span>
                        <select
                            value={filters.ageGroupId}
                            onChange={(event) => onChange(
                                'ageGroupId',
                                event.target.value,
                            )}
                        >
                            <option value="">Любой возраст</option>
                            {options.ageGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Город</span>
                        <select
                            value={filters.city}
                            onChange={(event) => onChange('city', event.target.value)}
                        >
                            <option value="">Все города</option>
                            {options.cities.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Стаж от</span>
                        <select
                            value={filters.minExperience}
                            onChange={(event) => onChange(
                                'minExperience',
                                event.target.value,
                            )}
                        >
                            <option value="">Любой стаж</option>
                            <option value="1">1 года</option>
                            <option value="3">3 лет</option>
                            <option value="5">5 лет</option>
                            <option value="10">10 лет</option>
                            <option value="15">15 лет</option>
                            <option value="20">20 лет</option>
                        </select>
                    </label>

                    <label>
                        <span>Цена до, ₽</span>
                        <input
                            type="number"
                            min="1"
                            max="10000000"
                            step="100"
                            value={filters.maxPrice}
                            placeholder="Например, 1500"
                            onChange={(event) => onChange(
                                'maxPrice',
                                event.target.value,
                            )}
                        />
                    </label>

                    <label>
                        <span>Рейтинг от</span>
                        <select
                            value={filters.minRating}
                            onChange={(event) => onChange(
                                'minRating',
                                event.target.value,
                            )}
                        >
                            <option value="">Любой рейтинг</option>
                            <option value="4">4.0</option>
                            <option value="4.5">4.5</option>
                            <option value="4.8">4.8</option>
                            <option value="5">5.0</option>
                        </select>
                    </label>
                </div>

                <div className="find-teacher-filters__actions">
                    <label className="find-teacher-filters__check">
                        <input
                            type="checkbox"
                            checked={filters.accessibleOnly}
                            onChange={(event) => onChange(
                                'accessibleOnly',
                                event.target.checked,
                            )}
                        />
                        <span>
                            Есть места по программе «Доступное образование»
                        </span>
                    </label>

                    <button
                        type="button"
                        disabled={!hasTeacherDirectoryFilters(filters)}
                        onClick={onReset}
                    >
                        Сбросить фильтры
                    </button>
                </div>
            </section>
        </div>
    );
}
