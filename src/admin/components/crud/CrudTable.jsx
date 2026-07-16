import {
    Badge,
    Button,
    Table,
    TableCell,
    TableRow,
} from '../ui/index.js';

function resolveValue(value, item, context) {
    if (typeof value === 'function') {
        return value(item, context);
    }

    return value;
}

function renderDefaultValue(value) {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return '—';
    }

    return String(value);
}

function renderColumnValue(
    column,
    item,
    context,
) {
    if (typeof column.render === 'function') {
        return column.render(item, context);
    }

    const value = item[column.key];

    if (column.type === 'status') {
        const isActive = Boolean(value);

        return (
            <Badge
                variant={
                    isActive
                        ? 'success'
                        : 'default'
                }
            >
                {isActive
                    ? column.activeLabel ?? 'Активен'
                    : column.inactiveLabel ?? 'Отключён'}
            </Badge>
        );
    }

    if (column.type === 'code') {
        return (
            <code className="crud-table__code">
                {renderDefaultValue(value)}
            </code>
        );
    }

    if (column.type === 'count') {
        return (
            <strong className="crud-table__count">
                {Number(value) || 0}
            </strong>
        );
    }

    if (column.type === 'boolean') {
        return value
            ? column.trueLabel ?? 'Да'
            : column.falseLabel ?? 'Нет';
    }

    return renderDefaultValue(value);
}

export function CrudTable({
    config,
    items,
    context = {},
    changingStatusId = null,
    deletingId = null,
    onEdit,
    onToggleStatus,
    onDelete,
}) {
    const configuredColumns = Array.isArray(config.columns)
        ? config.columns
        : [];

    const permissions = config.permissions ?? {};

    const idColumnConfig = config.idColumn ?? {};

    const columns = config.showIdColumn === false
        ? configuredColumns
        : [
            {
                key: 'id',
                label: idColumnConfig.label ?? 'ID',
                width: idColumnConfig.width ?? 65,
                align: idColumnConfig.align ?? 'center',
                type: 'id',
            },
            ...configuredColumns,
        ];

    const tableColumns = [
        ...columns,
        {
            key: '__actions',
            label: 'Действия',
            width: config.actionsColumnWidth ?? 255,
            align: 'right',
        },
    ];

    function handleDelete(item) {
        const itemName =
            typeof config.getItemLabel === 'function'
                ? config.getItemLabel(item)
                : item.name ?? `ID ${item.id}`;

        const confirmationMessage =
            typeof config.getDeleteConfirmMessage === 'function'
                ? config.getDeleteConfirmMessage(item)
                : `Удалить «${itemName}»?`;

        if (window.confirm(confirmationMessage)) {
            onDelete(item);
        }
    }

    return (
        <Table
            columns={tableColumns}
            minWidth={config.tableMinWidth ?? 1000}
        >
            {items.map((item) => {
                const canEdit =
                    permissions.update !== false
                    && resolveValue(
                        config.canEdit,
                        item,
                        context,
                    ) !== false;

                const canToggle =
                    permissions.toggle !== false
                    && item.is_active !== undefined
                    && resolveValue(
                        config.canToggle,
                        item,
                        context,
                    ) !== false;

                const canDelete =
                    permissions.delete !== false
                    && resolveValue(
                        config.canDelete,
                        item,
                        context,
                    ) !== false;

                const rowBusy =
                    changingStatusId !== null
                    || deletingId !== null;

                return (
                    <TableRow key={item.id}>
                        {columns.map((column) => (
                            <TableCell
                                key={column.key}
                                align={column.align ?? 'left'}
                                strong={Boolean(column.strong)}
                            >
                                {column.type === 'id' ? (
                                    <span className="crud-table__id">
                                        {item.id}
                                    </span>
                                ) : (
                                    renderColumnValue(
                                        column,
                                        item,
                                        context,
                                    )
                                )}
                            </TableCell>
                        ))}

                        <TableCell align="right">
                            <div className="crud-table__actions">
                                {canEdit && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={rowBusy}
                                        onClick={() => onEdit(item)}
                                    >
                                        Изменить
                                    </Button>
                                )}

                                {canToggle && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        loading={
                                            changingStatusId === item.id
                                        }
                                        disabled={
                                            deletingId !== null
                                            || (
                                                changingStatusId !== null
                                                && changingStatusId !== item.id
                                            )
                                        }
                                        onClick={() => (
                                            onToggleStatus(item)
                                        )}
                                    >
                                        {item.is_active
                                            ? 'Отключить'
                                            : 'Включить'}
                                    </Button>
                                )}

                                {permissions.delete !== false && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        loading={deletingId === item.id}
                                        disabled={
                                            !canDelete
                                            || changingStatusId !== null
                                            || (
                                                deletingId !== null
                                                && deletingId !== item.id
                                            )
                                        }
                                        onClick={() => handleDelete(item)}
                                    >
                                        Удалить
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                );
            })}
        </Table>
    );
}