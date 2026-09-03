import { useState } from 'react';

import { Button, Input, Modal } from '../../components/ui/index.js';

export function MaterialModerationModal({ material, isSaving, onClose, onModerate, onDownload }) {
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');
    if (!material) return null;

    async function decide(decision) {
        if (decision === 'rejected' && !comment.trim()) {
            setValidationError('Укажите причину отклонения');
            return;
        }
        setValidationError('');
        await onModerate(material.id, { decision, comment: comment.trim() });
    }

    const canModerate = material.publication_status === 'pending';
    return (
        <Modal
            isOpen
            title={`Материал №${material.id}`}
            description={`${material.author} · ${material.subject}`}
            onClose={onClose}
            footer={canModerate ? <><Button variant="danger" loading={isSaving} onClick={() => decide('rejected')}>Отклонить</Button><Button variant="primary" loading={isSaving} onClick={() => decide('approved')}>Одобрить</Button></> : null}
        >
            <div className="material-moderation">
                <section><h3>{material.title}</h3><p>{material.description || 'Без описания'}</p><p><strong>{material.access_type === 'paid' ? `${material.price_rub} ₽` : 'Бесплатно'}</strong></p></section>
                <section><h3>Файлы и ссылки</h3>{material.items.map((item) => (
                    <div className="material-moderation__item" key={item.id}>
                        <span>{item.title} · {item.format}</span>
                        {item.content_type === 'file'
                            ? <Button size="sm" variant="secondary" onClick={() => onDownload(item)}>Скачать</Button>
                            : <a href={item.external_url} target="_blank" rel="noreferrer">Открыть ссылку</a>}
                    </div>
                ))}</section>
                {canModerate && <Input label="Комментарий модератора" multiline rows={4} value={comment} error={validationError} onChange={(event) => setComment(event.target.value)} />}
                {material.moderation_comment && <p>Предыдущее решение: {material.moderation_comment}</p>}
            </div>
        </Modal>
    );
}
