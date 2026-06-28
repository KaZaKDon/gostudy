import styles from './Badge.module.css';

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) {
    return (
        <span
            className={[
                styles.badge,
                styles[`badge--${variant}`],
                styles[`badge--${size}`],
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </span>
    );
}