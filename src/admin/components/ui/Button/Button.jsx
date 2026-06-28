import styles from './Button.module.css';

export function Button({
    children,
    type = 'button',
    variant = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon = null,
    onClick,
}) {
    const classNames = [
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        fullWidth ? styles['button--full'] : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            className={classNames}
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
        >
            {loading && (
                <span className={styles.spinner} />
            )}

            {!loading && icon && (
                <span className={styles.icon}>
                    {icon}
                </span>
            )}

            <span>{children}</span>
        </button>
    );
}