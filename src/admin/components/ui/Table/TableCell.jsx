import styles from './Table.module.css';

export function TableCell({
    children,
    align = 'left',
    strong = false,
    className = '',
}) {
    return (
        <td
            className={[
                styles.cell,
                strong ? styles.strong : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            style={{ textAlign: align }}
        >
            {children}
        </td>
    );
}