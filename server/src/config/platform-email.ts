export const PLATFORM_EMAIL = Object.freeze({
    fromAddress: 'noreply@gostudyonline.ru',
    fromName: 'GoStudy',
    supportAddress: 'support@gostudyonline.ru',
});

export function isEmailAddress(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
