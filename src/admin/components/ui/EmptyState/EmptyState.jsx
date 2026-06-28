import styles from './EmptyState.module.css';

export function EmptyState({
    title = 'Нет данных',
    description,
    action = null,
    icon = null,
    className = '',
}) {
    return (
        <section
            className={[
                styles.emptyState,
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {icon && (
                <div className={styles.icon}>
                    {icon}
                </div>
            )}

            <div className={styles.content}>
                <h3 className={styles.title}>
                    {title}
                </h3>

                {description && (
                    <p className={styles.description}>
                        {description}
                    </p>
                )}
            </div>

            {action && (
                <div className={styles.action}>
                    {action}
                </div>
            )}
        </section>
    );
}