import { useEffect, useRef, useState } from 'react';

import { getTeacherBadges } from '../../../../../assets/teacherBadges.js';

export function TeacherBadgeList({ badgeKeys, compact = false }) {
    const badges = getTeacherBadges(badgeKeys);
    const displayedBadges = compact ? badges.slice(0, 6) : badges;
    const hiddenBadges = compact ? badges.slice(6) : [];
    const [activeBadge, setActiveBadge] = useState(null);
    const listRef = useRef(null);

    useEffect(() => {
        function closeTooltip(event) {
            if (!listRef.current?.contains(event.target)) {
                setActiveBadge(null);
            }
        }

        document.addEventListener('pointerdown', closeTooltip);
        return () => document.removeEventListener('pointerdown', closeTooltip);
    }, []);

    if (!badges.length) return null;

    return (
        <span
            ref={listRef}
            className={compact ? 'teacher-badges teacher-badges--compact' : 'teacher-badges'}
            aria-label="Значки преподавателя"
        >
            {displayedBadges.map((badge) => (
                <button
                    key={badge.key}
                    type="button"
                    className={activeBadge === badge.key
                        ? 'teacher-badge teacher-badge--active'
                        : 'teacher-badge'}
                    aria-label={badge.title}
                    aria-expanded={activeBadge === badge.key}
                    onClick={(event) => {
                        event.stopPropagation();
                        if (activeBadge === badge.key) {
                            setActiveBadge(null);
                            event.currentTarget.blur();
                        } else {
                            setActiveBadge(badge.key);
                        }
                    }}
                    onBlur={() => setActiveBadge(null)}
                >
                    <img src={badge.url} alt="" aria-hidden="true" />

                    <span className="teacher-badge__tooltip" role="tooltip">
                        <strong>{badge.title}</strong>
                        <small>{badge.description}</small>
                    </span>
                </button>
            ))}

            {hiddenBadges.length > 0 && (
                <span
                    className="teacher-badges__more"
                    title={hiddenBadges.map((badge) => badge.title).join(', ')}
                >
                    +{hiddenBadges.length}
                </span>
            )}
        </span>
    );
}
