import {
    useEffect,
    useRef,
    useState,
} from 'react';

export function ClassroomPdfPreview({
    sourceUrl,
    page,
    canChangePage,
    onPageChange,
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [resizeVersion, setResizeVersion] = useState(0);
    const currentPage = Math.min(
        Math.max(1, Number(page) || 1),
        Math.max(1, pageCount || 1),
    );

    useEffect(() => {
        if (!sourceUrl) {
            return undefined;
        }

        let isCurrent = true;
        let loadingTask;
        let loadedDocument;

        const loadDocument = async () => {
            try {
                const [pdfModule, workerModule] = await Promise.all([
                    import('pdfjs-dist'),
                    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
                ]);

                pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
                loadingTask = pdfModule.getDocument(sourceUrl);
                loadedDocument = await loadingTask.promise;

                if (isCurrent) {
                    setPdfDocument(loadedDocument);
                    setPageCount(loadedDocument.numPages);
                    setErrorMessage('');
                }
            } catch (error) {
                if (isCurrent) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Не удалось открыть PDF',
                    );
                }
            }
        };

        loadDocument();

        return () => {
            isCurrent = false;

            if (loadingTask) {
                loadingTask.destroy();
            } else if (loadedDocument) {
                loadedDocument.destroy();
            }
        };
    }, [sourceUrl]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            setResizeVersion((current) => current + 1);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!pdfDocument || !canvasRef.current || !containerRef.current) {
            return undefined;
        }

        let isCurrent = true;
        let renderTask;

        const renderPage = async () => {
            try {
                const pdfPage = await pdfDocument.getPage(currentPage);

                if (!isCurrent) {
                    return;
                }

                const baseViewport = pdfPage.getViewport({ scale: 1 });
                const availableWidth = Math.max(
                    280,
                    containerRef.current.clientWidth - 32,
                );
                const scale = Math.min(2.25, availableWidth / baseViewport.width);
                const viewport = pdfPage.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                const pixelRatio = window.devicePixelRatio || 1;

                canvas.width = Math.floor(viewport.width * pixelRatio);
                canvas.height = Math.floor(viewport.height * pixelRatio);
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;

                renderTask = pdfPage.render({
                    canvasContext: context,
                    viewport,
                    transform: pixelRatio === 1
                        ? null
                        : [pixelRatio, 0, 0, pixelRatio, 0, 0],
                });
                await renderTask.promise;
            } catch (error) {
                if (isCurrent && error?.name !== 'RenderingCancelledException') {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Не удалось показать страницу PDF',
                    );
                }
            }
        };

        renderPage();

        return () => {
            isCurrent = false;
            renderTask?.cancel();
        };
    }, [currentPage, pdfDocument, resizeVersion]);

    const handlePageSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const requestedPage = Math.min(
            Math.max(1, Number(formData.get('page')) || 1),
            Math.max(1, pageCount),
        );

        onPageChange(requestedPage);
    };

    return (
        <div className="classroom-pdf-preview">
            <div className="classroom-pdf-preview__toolbar">
                <button
                    type="button"
                    disabled={!canChangePage || currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Назад
                </button>

                <form onSubmit={handlePageSubmit}>
                    <label>
                        <span>Страница</span>
                        <input
                            key={`${currentPage}:${pageCount}`}
                            type="number"
                            name="page"
                            min="1"
                            max={Math.max(1, pageCount)}
                            defaultValue={currentPage}
                            disabled={!canChangePage || !pageCount}
                        />
                        <span>из {pageCount || '…'}</span>
                    </label>
                </form>

                <button
                    type="button"
                    disabled={!canChangePage || currentPage >= pageCount}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Вперёд
                </button>
            </div>

            {!canChangePage && pageCount > 0 && (
                <small className="classroom-pdf-preview__following">
                    Страницей управляет преподаватель
                </small>
            )}

            {errorMessage ? (
                <p className="classroom-file-preview__error">
                    {errorMessage}
                </p>
            ) : (
                <div className="classroom-pdf-preview__page" ref={containerRef}>
                    {!pdfDocument && <p>Подготавливаем PDF...</p>}
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}
