import { forwardRef } from 'react';

import styles from './Input.module.css';

export const Input = forwardRef(function Input({
    label,
    error,
    helperText,
    fullWidth = true,
    required = false,
    multiline = false,
    rows = 4,
    startIcon = null,
    endIcon = null,
    className = '',
    ...props
}, ref) {
    const FieldComponent = multiline ? 'textarea' : 'input';

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

            <span className={styles.fieldWrap}>
                {startIcon && (
                    <span className={styles.icon}>
                        {startIcon}
                    </span>
                )}

                <FieldComponent
                    ref={ref}
                    className={[
                        styles.field,
                        multiline ? styles.textarea : '',
                        startIcon ? styles.withStartIcon : '',
                        endIcon ? styles.withEndIcon : '',
                        error ? styles.error : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    rows={multiline ? rows : undefined}
                    required={required}
                    {...props}
                />

                {endIcon && (
                    <span className={styles.icon}>
                        {endIcon}
                    </span>
                )}
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