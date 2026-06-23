export function SettingsField({
    label,
    value,
}) {
    return (
        <div className="settings-field">
            <span className="settings-field__label">
                {label}
            </span>

            <input
                type="text"
                value={value}
                readOnly
            />
        </div>
    );
}