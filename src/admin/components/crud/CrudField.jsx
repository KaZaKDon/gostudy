import {
    Input,
    Select,
} from '../ui/index.js';

import './crud.css';

function resolveFieldValue(value, form, context) {
    if (typeof value === 'function') {
        return value({
            form,
            context,
        });
    }

    return value;
}

function resolveOptions(field, form, context) {
    const options = resolveFieldValue(
        field.options,
        form,
        context,
    );

    return Array.isArray(options)
        ? options
        : [];
}

export function CrudField({
    field,
    value,
    form,
    context = {},
    disabled = false,
    onChange,
}) {
    const isHidden = Boolean(
        resolveFieldValue(
            field.hidden,
            form,
            context,
        ),
    );

    if (isHidden) {
        return null;
    }

    const isDisabled = disabled || Boolean(
        resolveFieldValue(
            field.disabled,
            form,
            context,
        ),
    );

    const label = resolveFieldValue(
        field.label,
        form,
        context,
    );

    const helperText = resolveFieldValue(
        field.helperText,
        form,
        context,
    );

    const placeholder = resolveFieldValue(
        field.placeholder,
        form,
        context,
    );

    if (field.type === 'select') {
        return (
            <Select
                label={label}
                name={field.name}
                value={value ?? ''}
                options={resolveOptions(
                    field,
                    form,
                    context,
                )}
                placeholder={
                    placeholder
                    || 'Выберите значение'
                }
                helperText={helperText}
                required={Boolean(field.required)}
                disabled={isDisabled}
                onChange={onChange}
            />
        );
    }

    if (field.type === 'checkbox') {
        return (
            <label className="crud-field-checkbox">
                <input
                    type="checkbox"
                    name={field.name}
                    checked={Boolean(value)}
                    disabled={isDisabled}
                    onChange={onChange}
                />

                <span className="crud-field-checkbox__content">
                    <strong>
                        {label}
                    </strong>

                    {helperText && (
                        <small>
                            {helperText}
                        </small>
                    )}
                </span>
            </label>
        );
    }

    if (field.type === 'textarea') {
        return (
            <Input
                label={label}
                name={field.name}
                value={value ?? ''}
                multiline
                rows={field.rows ?? 4}
                placeholder={placeholder}
                helperText={helperText}
                minLength={field.minLength}
                maxLength={field.maxLength}
                required={Boolean(field.required)}
                disabled={isDisabled}
                onChange={onChange}
            />
        );
    }

    return (
        <Input
            label={label}
            name={field.name}
            type={
                field.type === 'number'
                    ? 'number'
                    : 'text'
            }
            value={value ?? ''}
            placeholder={placeholder}
            helperText={helperText}
            min={field.min}
            max={field.max}
            step={field.step}
            minLength={field.minLength}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete}
            required={Boolean(field.required)}
            disabled={isDisabled}
            onChange={onChange}
        />
    );
}