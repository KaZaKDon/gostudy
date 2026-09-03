import { useState } from 'react';

import { PUBLICATION_LABELS } from '../constants.js';
import { getMaterialCountLabel } from '../utils.js';

import { MaterialItemRow } from './MaterialItemRow.jsx';

export function MaterialsGroupRow({
    role,
    group,
    view,
    isSaving,
    onOpenItem,
    onEdit,
    onAssign,
    onSubmitModeration,
    onHide,
    onReport,
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <article
            className={
                isOpen
                    ? 'materials-group materials-group--open'
                    : 'materials-group'
            }
        >
            <button
                type="button"
                className="materials-group__summary"
                onClick={() => setIsOpen((value) => !value)}
            >
                <span className="materials-group__title">
                    {group.title}
                </span>

                <span className="materials-group__subject">
                    {group.subject}
                </span>

                <span className="materials-group__author">
                    {group.author || 'GoStudy'}
                </span>

                <span className="materials-group__count">
                    {getMaterialCountLabel(group.items.length)}
                </span>
            </button>

            {isOpen && (
                <div className="materials-group__content">
                    {'description' in group && group.description && (
                        <p className="materials-group__description">
                            {group.description}
                        </p>
                    )}

                    <div className="materials-group__meta">
                        <span>{group.access}</span>
                        {group.price_rub && <span>{group.price_rub} ₽</span>}
                        {group.is_owner && <span>{PUBLICATION_LABELS[group.publication_status] || group.publication_status}</span>}
                        {group.is_assigned && <span>Назначен преподавателем</span>}
                    </div>

                    {group.is_owner && group.moderation_comment && (
                        <p className="materials-message materials-message--error">
                            Комментарий модератора: {group.moderation_comment}
                        </p>
                    )}

                    {group.items.map((item) => (
                        <MaterialItemRow
                            key={item.id}
                            material={group}
                            item={item}
                            onOpen={onOpenItem}
                        />
                    ))}

                    <div className="materials-group__actions">
                        {role === 'teacher' && (group.is_owner || (view === 'catalog' && group.access_type === 'free')) && (
                            <button type="button" disabled={isSaving} onClick={() => onAssign(group)}>Назначить ученику</button>
                        )}
                        {group.is_owner && (
                            <button type="button" disabled={isSaving} onClick={() => onEdit(group)}>Редактировать</button>
                        )}
                        {group.is_owner && ['private', 'rejected', 'hidden'].includes(group.publication_status) && (
                            <button type="button" disabled={isSaving} onClick={() => onSubmitModeration(group.id)}>В общий каталог</button>
                        )}
                        {group.is_owner && ['pending', 'approved'].includes(group.publication_status) && (
                            <button type="button" className="material-item__danger" disabled={isSaving} onClick={() => onHide(group.id)}>Скрыть</button>
                        )}
                        {group.can_report && (
                            <button type="button" className="material-item__danger" onClick={() => onReport(group)}>Пожаловаться</button>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}
