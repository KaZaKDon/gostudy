import styles from './Toolbar.module.css';

export function Toolbar({
    children,
    actions = null,
    className = '',
}) {
    return (
        <section
            className={[
                styles.toolbar,
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className={styles.content}>
                {children}
            </div>

            {actions && (
                <div className={styles.actions}>
                    {actions}
                </div>
            )}
        </section>
    );
}