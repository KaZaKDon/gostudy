import defaults from '../../shared/platform-identity.json' with { type: 'json' };

export const PLATFORM_IDENTITY = Object.freeze({
    ...defaults,
    supportPhoneHref: `tel:${defaults.supportPhone.replace(/[^+0-9]/g, '')}`,
});
