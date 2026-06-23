export function MaterialItemRow({
    role,
    item,
    isExtraMaterial,
}) {
    const isTeacher = role === 'teacher';
    const isPaid = item.access === 'Платно';

    return (
        <div className="material-item">
            <div className="material-item__info">
                <strong>{item.title}</strong>

                <span>
                    {item.format}
                    {' · '}
                    {item.access}
                </span>
            </div>

            <div className="material-item__actions">
                <button type="button">
                    Открыть
                </button>

                {isTeacher ? (
                    <>
                        <button type="button">
                            Назначить
                        </button>

                        {isExtraMaterial && (
                            <>
                                <button type="button">
                                    Редактировать
                                </button>

                                <button
                                    type="button"
                                    className="material-item__danger"
                                >
                                    Скрыть
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {isPaid ? (
                            <button type="button">
                                Купить
                            </button>
                        ) : (
                            <button type="button">
                                Скачать
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}