import {
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    Button,
    Modal,
} from '../ui/index.js';

import { CrudField } from './CrudField.jsx';

import './crud.css';

function resolveFields(config, context) {
    const fields = typeof config.fields === 'function'
        ? config.fields(context)
        : config.fields;

    return Array.isArray(fields)
        ? fields
        : [];
}

function getDefaultValue(field, context) {
    if (
        Object.prototype.hasOwnProperty.call(
            field,
            'defaultValue',
        )
    ) {
        return typeof field.defaultValue === 'function'
            ? field.defaultValue(context)
            : field.defaultValue;
    }

    if (field.type === 'checkbox') {
        return false;
    }

    return '';
}

function createInitialForm(
    fields,
    item,
    context,
) {
    return fields.reduce(
        (result, field) => {
            const hasItemValue = item
                && Object.prototype.hasOwnProperty.call(
                    item,
                    field.name,
                );

            result[field.name] = hasItemValue
                ? item[field.name]
                : getDefaultValue(
                    field,
                    context,
                );

            return result;
        },
        {},
    );
}

function normalizeValue(field, value) {
    if (field.type === 'checkbox') {
        return Boolean(value);
    }

    if (field.type === 'number') {
        if (
            value === ''
            || value === null
            || value === undefined
        ) {
            return field.nullable
                ? null
                : 0;
        }

        return Number(value);
    }

    if (
        typeof value === 'string'
        && field.trim !== false
    ) {
        return value.trim();
    }

    return value;
}

function buildPayload(
    fields,
    form,
    item,
) {
    const payload = fields.reduce(
        (result, field) => {
            if (field.submit === false) {
                return result;
            }

            result[field.name] = normalizeValue(
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

export function CrudModal({
    config,
    item = null,
    context = {},
    isSaving = false,
    error = '',
    onClose,
    onSave,
}) {
    const formRef = useRef(null);

    const fields = useMemo(
        () => resolveFields(
            config,
            context,
        ),
        [
            config,
            context,
        ],
    );

    const [form, setForm] = useState(
        () => createInitialForm(
            fields,
            item,
            context,
        ),
    );

    const [localError, setLocalError] =
        useState('');

    const isEditing = Boolean(item?.id);

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setLocalError('');

        setForm((currentForm) => ({
            ...currentForm,
            [name]: type === 'checkbox'
                ? checked
                : value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        const rawPayload = buildPayload(
            fields,
            form,
            item,
        );

        const payload =
            typeof config.transformPayload
                === 'function'
                ? config.transformPayload(
                    rawPayload,
                    {
                        item,
                        context,
                        form,
                    },
                )
                : rawPayload;

        if (
            typeof config.validate
            === 'function'
        ) {
            const validationMessage =
                config.validate(
                    payload,
                    {
                        item,
                        context,
                        form,
                    },
                );

            if (validationMessage) {
                setLocalError(
                    validationMessage,
                );

                return;
            }
        }

        setLocalError('');
        onSave(payload);
    }

    function submitForm() {
        formRef.current?.requestSubmit();
    }

    const title = isEditing
        ? (
            config.editTitle
            || `Редактирование: ${config.entityName}`
        )
        : (
            config.createTitle
            || `Новая запись: ${config.entityName}`
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
                        type="button"
                        variant="primary"
                        loading={isSaving}
                        onClick={submitForm}
                    >
                        {isEditing
                            ? 'Сохранить'
                            : 'Создать'}
                    </Button>
                </>
            )}
        >
            <form
                ref={formRef}
                className="crud-form"
                onSubmit={handleSubmit}
            >
                {(localError || error) && (
                    <div className="admin-alert">
                        {localError || error}
                    </div>
                )}

                {fields.map((field) => (
                    <CrudField
                        key={field.name}
                        field={field}
                        value={form[field.name]}
                        form={form}
                        context={context}
                        disabled={isSaving}
                        onChange={handleChange}
                    />
                ))}
            </form>
        </Modal>
    );
}