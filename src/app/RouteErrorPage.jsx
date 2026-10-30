import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
export function RouteErrorPage() {
    const error = useRouteError();
    const stale = /dynamically imported|Loading chunk|module script|Importing a module/i.test(String(error?.message || error));
    useEffect(() => {
        if (!stale) return;
        try {
            if (!sessionStorage.getItem('gostudy-chunk-recovery')) {
                sessionStorage.setItem('gostudy-chunk-recovery', '1');
                window.location.reload();
            }
        } catch { /* Show the recovery button if storage is unavailable. */ }
    }, [stale]);
    return <main style={{ padding: '32px', maxWidth: '720px', margin: 'auto' }}>
        <h1>Не удалось открыть страницу</h1>
        <p>Возможно, сайт обновился. Загрузите актуальную версию страницы.</p>
        <button type="button" onClick={() => window.location.reload()}>Обновить страницу</button>
        <p><a href="/">На главную</a></p>
    </main>;
}
