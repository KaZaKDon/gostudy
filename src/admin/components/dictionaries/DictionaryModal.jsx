import {
    useMemo,
    useState,
} from 'react';

import {
    Button,
    Modal,
} from '../ui/index.js';

import {
    DictionaryField,
} from './DictionaryField.jsx';

function getDefaultFieldValue(field) {
    if (
        Object.prototype.hasOwnProperty.call(
            field,
            'defaultValue',
        )
    ) {
        return typeof field.defaultValue === 'function'
            ? field.defaultValue()
            : field.defaultValue;
    }

    if (field.type === 'checkbox') {
        return false;
    }

    if (field.type === 'number') {
        return '';
    }

    return '';
}

function createInitialForm(fields, item) {
    return fields.reduce(
        (form, field) => {
            const itemHasValue =
                item
                && Object.prototype.hasOwnProperty.call(
                    item,
                    field.name,
                );

            form[field.name] = itemHasValue
                ? item[field.name]
                : getDefaultFieldValue(field);

            return form;
        },
        {},
    );
}

function normalizeFieldValue(field, value) {
    if (field.type === 'checkbox') {
        return Boolean(value);
    }

    if (field.type === 'number') {
        if (value === '' || value === null) {
            return field.nullable ? null : 0;
        }

        return Number(value);
    }

    if (typeof value === 'string') {
        return field.trim === false
            ? value
            : value.trim();
    }

    return value;
}

function buildPayload(fields, form, item) {
    const payload = fields.reduce(
        (result, field) => {
            if (field.submit === false) {
                return result;
            }

            result[field.name] = normalizeFieldValue(
                field,
                form[field.name],
            );

            return result;
        },
        {},
    );

    if (item?.id) {
        payload.id = item.id;
    }

    return payload;
}

export function DictionaryModal({
    config,
    item,
    isSaving,
    error,
    context = {},
    onClose,
    onSave,
}) {
    const fields = useMemo(
        () => (
            typeof config.fields === 'function'
                ? config.fields(context)
                : config.fields
        ),
        [
            config,
            context,
        ],
    );

    const [form, setForm] = useState(() => (
        createInitialForm(
            fields,
            item,
        )
    ));

    const isEditing = Boolean(item?.id);

    const formId = `dictionary-form-${
        isEditing
            ? item.id
            : 'new'
    }`;

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: type === 'checkbox'
                ? checked
                : value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        const payload = buildPayload(
            fields,
            form,
            item,
        );

        if (typeof config.validate === 'function') {
            const validationMessage = config.validate(
                payload,
                {
                    item,
                    context,
                },
            );

            if (validationMessage) {
                onSave(
                    null,
                    validationMessage,
                );

                return;
            }
        }

        onSave(payload);
    }

    const title = isEditing
        ? (
            config.editTitle
            ?? `Редактирование: ${config.entityName}`
        )
        : (
            config.createTitle
            ?? `Новая запись: ${config.entityName}`
        );

    const description = isEditing
        ? config.editDescription
        : config.createDescription;

    return (
        <Modal
            isOpen
            title={title}
            description={description}
            onClose={
                isSaving
                    ? undefined
                    : onClose
            }
            footer={(
                <>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        Отмена
                    </Button>

                    <Button
                        type="submit"
                        form={formId}
                        variant="primary"
                        loading={isSaving}
                    >
                        {isEditing
                            ? 'Сохранить'
                            : 'Создать'}
                    </Button>
                </>
            )}
        >
            <form
                id={formId}
                className="dictionary-form"
                onSubmit={handleSubmit}
            >
                {error && (
                    <div className="admin-alert">
                        {error}
                    </div>
                )}

                {fields.map((field) => (
                    <DictionaryField
                        key={field.name}
                        field={field}
                        value={form[field.name]}
                        form={form}
                        disabled={isSaving}
                        onChange={handleChange}
                    />
                ))}
            </form>
        </Modal>
    );
}