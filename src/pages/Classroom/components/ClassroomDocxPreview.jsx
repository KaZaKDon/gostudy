import {
    useEffect,
    useRef,
    useState,
} from 'react';

const DOCX_RENDER_OPTIONS = {
    breakPages: true,
    ignoreFonts: false,
    ignoreHeight: false,
    ignoreLastRenderedPageBreak: true,
    ignoreWidth: false,
    renderChanges: false,
    renderEndnotes: true,
    renderFooters: true,
    renderFootnotes: true,
    renderHeaders: true,
    useBase64URL: true,
};

export function ClassroomDocxPreview({ data }) {
    const contentRef = useRef(null);
    const stylesRef = useRef(null);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const contentContainer = contentRef.current;
        const stylesContainer = stylesRef.current;

        if (!data || !contentContainer || !stylesContainer) {
            return undefined;
        }

        let isCurrent = true;
        const detachedContent = document.createElement('div');
        const detachedStyles = document.createElement('div');

        contentContainer.replaceChildren();
        stylesContainer.replaceChildren();
        setStatus('loading');
        setErrorMessage('');

        const renderDocument = async () => {
            try {
                const { renderAsync } = await import('docx-preview');

                await renderAsync(
                    data,
                    detachedContent,
                    detachedStyles,
                    DOCX_RENDER_OPTIONS,
                );

                if (!isCurrent) {
                    return;
                }

                stylesContainer.replaceChildren(
                    ...detachedStyles.childNodes,
                );
                contentContainer.replaceChildren(
                    ...detachedContent.childNodes,
                );
                setStatus('success');
            } catch (error) {
                if (!isCurrent) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось открыть документ DOCX',
                );
                setStatus('error');
            }
        };

        renderDocument();

        return () => {
            isCurrent = false;
            contentContainer.replaceChildren();
            stylesContainer.replaceChildren();
        };
    }, [data]);

    return (
        <div className="classroom-docx-preview">
            <div ref={stylesRef} />

            {status === 'loading' && (
                <p className="classroom-docx-preview__status">
                    Подготавливаем документ...
                </p>
            )}

            {status === 'error' && (
                <p className="classroom-file-preview__error">
                    {errorMessage}
                </p>
            )}

            <div
                ref={contentRef}
                className="classroom-docx-preview__document"
                hidden={status !== 'success'}
            />
        </div>
    );
}
