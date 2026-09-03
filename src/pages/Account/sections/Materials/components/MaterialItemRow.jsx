export function MaterialItemRow({
    material,
    item,
    onOpen,
}) {
    const isPaidLocked = material.access_type === 'paid' && !item.can_open;

    return (
        <div className="material-item">
            <div className="material-item__info">
                <strong>{item.title}</strong>

                <span>
                    {item.format}
                    {item.file_size ? ` · ${formatBytes(item.file_size)}` : ''}
                </span>
            </div>

            <div className="material-item__actions">
                <button type="button" onClick={() => onOpen(material, item)}>
                    {isPaidLocked ? 'Купить — скоро' : item.content_type === 'file' ? 'Скачать' : 'Открыть'}
                </button>
            </div>
        </div>
    );
}

function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
