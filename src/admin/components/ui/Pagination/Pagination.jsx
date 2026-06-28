import { Button } from '../Button/index.js';

import styles from './Pagination.module.css';

export function Pagination({
    page = 1,
    pages = 1,
    total = 0,
    onPageChange,
    className = '',
}) {
    const currentPage = Math.max(1, page);
    const totalPages = Math.max(1, pages);

    function handlePrevious() {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    }

    function handleNext() {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    }

    return (
        <section
            className={[
                styles.pagination,
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span className={styles.total}>
                Всего: {total}
            </span>

            <div className={styles.actions}>
                <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage <= 1}
                    onClick={handlePrevious}
                >
                    Назад
                </Button>

                <strong className={styles.counter}>
                    {currentPage} / {totalPages}
                </strong>

                <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage >= totalPages}
                    onClick={handleNext}
                >
                    Вперёд
                </Button>
            </div>
        </section>
    );
}