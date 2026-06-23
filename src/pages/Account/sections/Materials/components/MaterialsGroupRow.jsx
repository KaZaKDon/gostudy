import { useState } from 'react';

import { getMaterialCountLabel } from '../utils.js';

import { MaterialItemRow } from './MaterialItemRow.jsx';

export function MaterialsGroupRow({
    role,
    group,
    isExtraMaterial,
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
                    {group.author}
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

                    {'price' in group && (
                        <div className="materials-group__meta">
                            <span>Доступ: {group.access}</span>
                            <span>Стоимость: {group.price}</span>
                            <span>
                                Статус:{' '}
                                {group.isVisible
                                    ? 'показывается'
                                    : 'скрыт'}
                            </span>
                        </div>
                    )}

                    {group.items.map((item) => (
                        <MaterialItemRow
                            key={item.id}
                            role={role}
                            item={item}
                            isExtraMaterial={isExtraMaterial}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}