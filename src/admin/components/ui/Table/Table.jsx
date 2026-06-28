import styles from './Table.module.css';

export function Table({
    columns = [],
    children,
    minWidth = 960,
    className = '',
}) {
    return (
        <section
            className={[
                styles.tableWrap,
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <table
                className={styles.table}
                style={{ minWidth }}
            >
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                style={{
                                    width: column.width,
                                    textAlign: column.align || 'left',
                                }}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {children}
                </tbody>
            </table>
        </section>
    );
}