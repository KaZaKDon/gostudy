import { forwardRef } from 'react';

import styles from './Select.module.css';

export const Select = forwardRef(function Select({
    label,
    error,
    helperText,
    fullWidth = true,
    required = false,
    options = [],
    placeholder,
    className = '',
    ...props
}, ref) {
    return (
        <label
            className={[
                styles.wrapper,
                fullWidth ? styles.full : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {label && (
                <span className={styles.label}>
                    {label}

                    {required && (
                        <span className={styles.required}>
                            *
                        </span>
                    )}
                </span>
            )}

            <span className={styles.selectWrap}>
                <select
                    ref={ref}
                    className={[
                        styles.select,
                        error ? styles.error : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    required={required}
                    {...props}
                >
                    {placeholder && (
                        <option value="">
                            {placeholder}
                        </option>
                    )}

                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className={styles.arrow}>⌄</span>
            </span>

            {error ? (
                <span className={styles.errorText}>
                    {error}
                </span>
            ) : (
                helperText && (
                    <span className={styles.helper}>
                        {helperText}
                    </span>
                )
            )}
        </label>
    );
});