import { Button } from '../Button/index.js';

import styles from './Modal.module.css';

export function Modal({
    isOpen,
    title,
    description,
    children,
    footer = null,
    onClose,
}) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <header className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{title}</h2>

                        {description && (
                            <p className={styles.description}>{description}</p>
                        )}
                    </div>

                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                </header>

                <div className={styles.body}>
                    {children}
                </div>

                {footer && (
                    <footer className={styles.footer}>
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    );
}