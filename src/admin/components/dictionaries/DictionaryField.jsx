import {
    Input,
    Select,
} from '../ui/index.js';

function getFieldOptions(field) {
    if (typeof field.getOptions === 'function') {
        return field.getOptions();
    }

    return field.options ?? [];
}

export function DictionaryField({
    field,
    value,
    form,
    disabled,
    onChange,
}) {
    const isHidden = typeof field.hidden === 'function'
        ? field.hidden(form)
        : Boolean(field.hidden);

    if (isHidden) {
        return null;
    }

    const fieldDisabled = typeof field.disabled === 'function'
        ? field.disabled(form)
        : Boolean(field.disabled);

    const commonProps = {
        label: field.label,
        name: field.name,
        value: value ?? '',
        required: Boolean(field.required),
        disabled: disabled || fieldDisabled,
        helperText: field.helperText,
        onChange,
    };

    if (field.type === 'select') {
        return (
            <Select
                {...commonProps}
                options={getFieldOptions(field)}
                placeholder={
                    field.placeholder
                    ?? 'Выберите значение'
                }
            />
        );
    }

    if (field.type === 'checkbox') {
        return (
            <label className="dictionary-field-checkbox">
                <input
                    type="checkbox"
                    name={field.name}
                    checked={Boolean(value)}
                    disabled={disabled || fieldDisabled}
                    onChange={onChange}
                />

                <span className="dictionary-field-checkbox__content">
                    <strong>
                        {field.label}
                    </strong>

                    {field.helperText && (
                        <small>
                            {field.helperText}
                        </small>
                    )}
                </span>
            </label>
        );
    }

    if (field.type === 'textarea') {
        return (
            <label className="dictionary-field">
                <span className="dictionary-field__label">
                    {field.label}

                    {field.required && (
                        <span aria-hidden="true">
                            {' '}*
                        </span>
                    )}
                </span>

                <textarea
                    className="dictionary-field__textarea"
                    name={field.name}
                    value={value ?? ''}
                    rows={field.rows ?? 4}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    required={Boolean(field.required)}
                    disabled={disabled || fieldDisabled}
                    onChange={onChange}
                />

                {field.helperText && (
                    <small className="dictionary-field__helper">
                        {field.helperText}
                    </small>
                )}
            </label>
        );
    }

    return (
        <Input
            {...commonProps}
            type={
                field.type === 'number'
                    ? 'number'
                    : 'text'
            }
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            minLength={field.minLength}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete}
        />
    );
}