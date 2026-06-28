import styles from './Loader.module.css';

export function Loader({
    text = 'Загрузка...',
    size = 'md',
    centered = true,
    className = '',
}) {
    return (
        <div
            className={[
                styles.loader,
                styles[`loader--${size}`],
                centered ? styles.centered : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span className={styles.spinner} />

            {text && (
                <span className={styles.text}>
                    {text}
                </span>
            )}
        </div>
    );
}