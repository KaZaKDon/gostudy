import badgeManifest from './badges.json';

const badgeUrls = import.meta.glob('./svg/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
});

const badgesByKey = new Map(
    badgeManifest.badges.map((badge) => [
        badge.key,
        { ...badge, url: badgeUrls[`./${badge.path}`] },
    ]),
);

export function getTeacherBadges(keys = []) {
    return keys.map((key) => badgesByKey.get(key)).filter(Boolean);
}
