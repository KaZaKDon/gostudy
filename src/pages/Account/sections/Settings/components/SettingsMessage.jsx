export function SettingsMessage({
    children,
    type = 'info',
}) {
    if (!children) {
        return null;
    }

    return (
        <p
            className={`settings-panel__message settings-panel__message--${type}`}
            role={type === 'error' ? 'alert' : 'status'}
        >
            {children}
        </p>
    );
}
