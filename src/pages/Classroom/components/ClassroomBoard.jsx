import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

const COLORS = ['#2d2926', '#9b2c20', '#246b54', '#24527a'];

function drawStroke(context, stroke, width, height) {
    const points = Array.isArray(stroke.points) ? stroke.points : [];

    if (points.length < 2) {
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    context.beginPath();
    context.strokeStyle = stroke.color;
    context.lineWidth = Number(stroke.width) * pixelRatio;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.moveTo(points[0].x * width, points[0].y * height);

    for (const point of points.slice(1)) {
        context.lineTo(point.x * width, point.y * height);
    }

    context.stroke();
}

export function ClassroomBoard({
    board,
    canDraw,
    canClear,
    viewerId,
    isTeacher,
}) {
    const canvasRef = useRef(null);
    const draftRef = useRef(null);
    const [color, setColor] = useState(COLORS[0]);
    const [width, setWidth] = useState(4);
    const [isEraser, setIsEraser] = useState(false);
    const [tool, setTool] = useState('draw');
    const [actionError, setActionError] = useState('');

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of board.strokes) {
            drawStroke(context, stroke, canvas.width, canvas.height);
        }
    }, [board.strokes]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return undefined;
        }

        const resize = () => {
            const bounds = canvas.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
            canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
            redraw();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        return () => observer.disconnect();
    }, [redraw]);

    useEffect(redraw, [redraw]);

    const pointFromEvent = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();

        return {
            x: Number(((event.clientX - bounds.left) / bounds.width).toFixed(5)),
            y: Number(((event.clientY - bounds.top) / bounds.height).toFixed(5)),
        };
    };

    const handlePointerDown = (event) => {
        if (!canDraw) {
            return;
        }

        if (tool === 'text') {
            const content = window.prompt('Введите текст для доски:')?.trim();
            if (!content) return;
            const point = pointFromEvent(event);
            setActionError('');
            board.addText({ content, color, ...point }).catch((error) => setActionError(
                error instanceof Error ? error.message : 'Не удалось добавить текст',
            ));
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        const point = pointFromEvent(event);
        draftRef.current = [point, point];
    };

    const handlePointerMove = (event) => {
        if (tool !== 'draw') return;
        const draft = draftRef.current;

        if (!draft || draft.length >= 500) {
            return;
        }

        const point = pointFromEvent(event);
        const previous = draft[draft.length - 1];

        if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.001) {
            return;
        }

        draft.push(point);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        drawStroke(context, {
            color: isEraser ? '#ffffff' : color,
            width: isEraser ? Math.max(16, width * 3) : width,
            points: [previous, point],
        }, canvas.width, canvas.height);
    };

    const finishStroke = () => {
        if (tool !== 'draw') return;
        const points = draftRef.current;
        draftRef.current = null;

        if (!points || points.length < 2) {
            return;
        }

        setActionError('');
        board.addStroke({
            color: isEraser ? '#ffffff' : color,
            width: isEraser ? Math.max(16, width * 3) : width,
            points,
        }).catch((error) => {
            setActionError(error instanceof Error
                ? error.message
                : 'Не удалось сохранить штрих');
            redraw();
        });
    };

    const handleClear = () => {
        if (!window.confirm('Очистить доску у обоих участников?')) {
            return;
        }

        setActionError('');
        board.clear().catch((error) => setActionError(
            error instanceof Error ? error.message : 'Не удалось очистить доску',
        ));
    };

    return (
        <section className="classroom-board">
            <div className="classroom-board__toolbar">
                <strong>Совместная доска</strong>

                <div className="classroom-board__colors" aria-label="Цвет карандаша">
                    {COLORS.map((item) => (
                        <button
                            type="button"
                            className={!isEraser && color === item ? 'is-active' : ''}
                            key={item}
                            aria-label={`Выбрать цвет ${item}`}
                            style={{ '--board-color': item }}
                            onClick={() => {
                                setColor(item);
                                setIsEraser(false);
                            }}
                        />
                    ))}
                </div>

                <label>
                    Толщина
                    <select value={width} onChange={(event) => setWidth(Number(event.target.value))}>
                        <option value="2">Тонкая</option>
                        <option value="4">Обычная</option>
                        <option value="8">Толстая</option>
                    </select>
                </label>

                <button
                    type="button"
                    className={tool === 'draw' && isEraser ? 'is-active' : ''}
                    onClick={() => {
                        setTool('draw');
                        setIsEraser((current) => !current);
                    }}
                >
                    Ластик
                </button>

                <button
                    type="button"
                    className={tool === 'text' ? 'is-active' : ''}
                    disabled={!canDraw}
                    onClick={() => {
                        setTool('text');
                        setIsEraser(false);
                    }}
                >
                    Текст
                </button>

                {canClear && (
                    <button type="button" className="is-danger" onClick={handleClear}>
                        Очистить
                    </button>
                )}
            </div>

            {(board.errorMessage || actionError) && (
                <p className="classroom-inline-error" role="alert">
                    {actionError || board.errorMessage}
                </p>
            )}

            <div className="classroom-board__surface">
                <canvas
                    ref={canvasRef}
                    className={`${canDraw ? 'classroom-board__canvas' : 'classroom-board__canvas is-readonly'}${tool === 'text' ? ' is-text-tool' : ''}`}
                    aria-label="Совместная доска урока"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishStroke}
                    onPointerCancel={finishStroke}
                />
                {board.texts.map((text) => {
                    const canEdit = canDraw && (isTeacher || Number(text.author_id) === Number(viewerId));
                    return (
                        <button
                            type="button"
                            key={text.id}
                            className="classroom-board__text"
                            style={{ left: `${text.x * 100}%`, top: `${text.y * 100}%`, color: text.color }}
                            title={canEdit ? 'Перетащить; двойной щелчок — изменить' : ''}
                            onDoubleClick={() => {
                                if (!canEdit) return;
                                const content = window.prompt('Изменить текст:', text.content)?.trim();
                                if (!content) return;
                                board.updateText(text.id, {
                                    content,
                                    color: text.color,
                                    x: text.x,
                                    y: text.y,
                                }).catch((error) => setActionError(error.message));
                            }}
                            onPointerDown={(event) => {
                                if (!canEdit) return;
                                event.stopPropagation();
                                event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerUp={(event) => {
                                if (!canEdit) return;
                                const bounds = event.currentTarget.parentElement.getBoundingClientRect();
                                const x = Math.max(0, Math.min(0.95, (event.clientX - bounds.left) / bounds.width));
                                const y = Math.max(0, Math.min(0.95, (event.clientY - bounds.top) / bounds.height));
                                board.updateText(text.id, {
                                    content: text.content,
                                    color: text.color,
                                    x: Number(x.toFixed(5)),
                                    y: Number(y.toFixed(5)),
                                })
                                    .catch((error) => setActionError(error.message));
                            }}
                            onContextMenu={(event) => {
                                if (!canEdit) return;
                                event.preventDefault();
                                if (window.confirm('Удалить этот текст с доски?')) {
                                    board.deleteText(text.id).catch((error) => setActionError(error.message));
                                }
                            }}
                        >
                            {text.content}
                        </button>
                    );
                })}
            </div>

            {!canDraw && (
                <span className="classroom-board__readonly">
                    После завершения урока доска доступна только для просмотра.
                </span>
            )}
        </section>
    );
}
