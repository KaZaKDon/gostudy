export function SettingsField({
    label,
    value,
    hint,
}) {
    return (
        <div className="settings-field">
            <span className="settings-field__label">
                {label}
            </span>

            <div className="settings-field__value">
                {value}
            </div>

            {hint && (
                <small className="settings-field__hint">
                    {hint}
                </small>
            )}
        </div>
    );
}
