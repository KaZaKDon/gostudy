import styles from './Table.module.css';

export function TableRow({
    children,
    onClick,
    className = '',
}) {
    return (
        <tr
            className={[
                styles.row,
                onClick ? styles.clickable : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}