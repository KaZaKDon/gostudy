import { useEffect, useMemo, useState } from 'react';

export function AssignMaterialModal({
    material,
    options,
    isSaving,
    onLoadOptions,
    onAssign,
    onUnassign,
    onClose,
}) {
    const [relationId, setRelationId] = useState('');
    const [error, setError] = useState('');
    const relations = useMemo(() => (
        (options?.relations || []).filter(
            (relation) => relation.subject_id === material?.subject_id,
        )
    ), [material?.subject_id, options?.relations]);

    useEffect(() => {
        if (!material) return;
        onLoadOptions().catch((requestError) => setError(requestError.message));
    }, [material, onLoadOptions]);

    if (!material) return null;

    async function handleAssign(event) {
        event.preventDefault();
        if (!relationId) {
            setError('Выберите ученика');
            return;
        }
        try {
            await onAssign(material.id, relationId);
            setRelationId('');
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function handleUnassign(currentRelationId) {
        try {
            await onUnassign(material.id, currentRelationId);
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <div className="material-modal">
            <button type="button" className="material-modal__overlay" aria-label="Закрыть" onClick={onClose} />
            <section className="material-modal__panel material-modal__panel--compact">
                <header className="material-modal__header">
                    <div>
                        <span>Назначение ученику</span>
                        <h2>{material.title}</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </header>

                <form className="material-assignment" onSubmit={handleAssign}>
                    {error && <p className="materials-message materials-message--error">{error}</p>}
                    <label>
                        <span>Ученик по предмету «{material.subject}»</span>
                        <select value={relationId} onChange={(event) => setRelationId(event.target.value)}>
                            <option value="">Выберите ученика</option>
                            {relations.map((relation) => (
                                <option key={relation.relation_id} value={relation.relation_id}>
                                    {relation.student_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {!relations.length && (
                        <p className="material-modal__hint">
                            Нет активных учеников по этому предмету.
                        </p>
                    )}
                    <button type="submit" className="material-modal__accept" disabled={isSaving || !relations.length}>
                        Назначить
                    </button>
                </form>

                <div className="material-assignment__current">
                    <h3>Уже назначено</h3>
                    {material.assignments?.length ? material.assignments.map((assignment) => (
                        <div key={assignment.assignment_id}>
                            <span>{assignment.student_name}</span>
                            <button type="button" disabled={isSaving} onClick={() => handleUnassign(assignment.relation_id)}>
                                Отменить назначение
                            </button>
                        </div>
                    )) : <p>Назначений пока нет.</p>}
                </div>
            </section>
        </div>
    );
}
