import {
    Button,
    Input,
    Select,
    Toolbar,
} from '../ui/index.js';

function resolveOptions(filter, context) {
    const options = typeof filter.options === 'function'
        ? filter.options(context)
        : filter.options;

    return Array.isArray(options)
        ? options
        : [];
}

export function CrudToolbar({
    config,
    filters,
    context = {},
    isLoading = false,
    onFilterChange,
    onResetFilters,
    onReload,
    onCreate,
}) {
    const filterConfig = Array.isArray(config.filters)
        ? config.filters
        : [];

    const permissions = config.permissions ?? {};

    return (
        <Toolbar
            actions={(
                <>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={isLoading}
                        onClick={onReload}
                    >
                        Обновить
                    </Button>

                    {permissions.create !== false && (
                        <Button
                            type="button"
                            variant="primary"
                            disabled={
                                isLoading
                                || Boolean(
                                    config.disableCreate?.(
                                        context,
                                    ),
                                )
                            }
                            onClick={onCreate}
                        >
                            {config.createButtonLabel
                                ?? 'Добавить'}
                        </Button>
                    )}
                </>
            )}
        >
            {filterConfig.map((filter) => {
                const value =
                    filters[filter.name]
                    ?? filter.defaultValue
                    ?? '';

                if (
                    filter.type === 'select'
                    || filter.type === 'status'
                ) {
                    return (
                        <Select
                            key={filter.name}
                            label={filter.label}
                            name={filter.name}
                            value={value}
                            options={resolveOptions(
                                filter,
                                context,
                            )}
                            placeholder={
                                filter.placeholder
                            }
                            disabled={isLoading}
                            onChange={onFilterChange}
                        />
                    );
                }

                return (
                    <Input
                        key={filter.name}
                        label={filter.label}
                        name={filter.name}
                        type={
                            filter.type === 'number'
                                ? 'number'
                                : 'text'
                        }
                        value={value}
                        placeholder={
                            filter.placeholder
                        }
                        min={filter.min}
                        max={filter.max}
                        step={filter.step}
                        disabled={isLoading}
                        onChange={onFilterChange}
                    />
                );
            })}

            {filterConfig.length > 0 && (
                <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={onResetFilters}
                >
                    Сбросить
                </Button>
            )}
        </Toolbar>
    );
}