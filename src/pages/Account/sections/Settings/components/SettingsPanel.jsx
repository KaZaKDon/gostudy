import { SettingsField } from './SettingsField.jsx';
import { DocumentsSettings } from './DocumentsSettings.jsx';
import { PayoutSettings } from './PayoutSettings.jsx';

export function SettingsPanel({
    section,
    onAction,
}) {
    if (!section) {
        return null;
    }

    if (section.type === 'documents') {
        return (
            <section className="settings-panel">
                <header className="settings-panel__header">
                    <span>Настройки</span>
                    <h3>{section.title}</h3>
                </header>

                <DocumentsSettings section={section} />
            </section>
        );
    }

    if (section.type === 'payouts') {
        return (
            <section className="settings-panel">
                <header className="settings-panel__header">
                    <span>Настройки</span>
                    <h3>{section.title}</h3>
                </header>

                <PayoutSettings section={section} />
            </section>
        );
    }

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>{section.title}</h3>
            </header>

            <div className="settings-panel__fields">
                {(section.fields || []).map((field) => (
                    <SettingsField
                        key={field.label}
                        label={field.label}
                        value={field.value}
                    />
                ))}
            </div>

            {section.actionLabel && (
                <div className="settings-panel__actions">
                    <button
                        type="button"
                        className="settings-panel__save"
                        onClick={onAction}
                    >
                        {section.actionLabel}
                    </button>
                </div>
            )}
        </section>
    );
}