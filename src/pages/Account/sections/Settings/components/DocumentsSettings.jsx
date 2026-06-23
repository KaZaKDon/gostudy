export function DocumentsSettings({
    section,
}) {
    return (
        <div className="settings-documents">
            <section className="settings-documents__block">
                <h4>Диплом</h4>

                <p>
                    {section.diploma.fileName ??
                        'Не загружен'}
                </p>

                <div className="settings-documents__actions">
                    <button type="button">
                        Загрузить диплом
                    </button>
                </div>
            </section>

            <section className="settings-documents__block">
                <h4>Сертификаты</h4>

                {section.certificates.map(
                    (certificate) => (
                        <div
                            key={certificate.id}
                            className="settings-documents__certificate"
                        >
                            <span>
                                {certificate.name}
                            </span>

                            <div className="settings-documents__actions">
                                <button type="button">
                                    Просмотреть
                                </button>

                                <button type="button">
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ),
                )}

                <div className="settings-documents__actions">
                    <button type="button">
                        Добавить сертификат
                    </button>
                </div>
            </section>

            <section className="settings-documents__block">
                <h4>
                    Статус проверки
                </h4>

                <p className="settings-documents__status">
                    🟡 {section.verificationStatus}
                </p>
            </section>
        </div>
    );
}