import { useState } from 'react';

import { Badge, Button, EmptyState, Input, Loader, Modal, Select, Table, TableCell, TableRow } from '../../components/ui/index.js';

const reasonLabels = { copyright: 'Авторские права', inappropriate: 'Недопустимое содержание', harmful: 'Вредная информация', broken_link: 'Нерабочая ссылка', other: 'Другое' };
const columns = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'material', label: 'Материал' },
    { key: 'reporter', label: 'Заявитель' },
    { key: 'reason', label: 'Причина' },
    { key: 'status', label: 'Статус' },
    { key: 'action', label: 'Действие', width: '110px' },
];

export function MaterialReports({ reports, status, selected, isLoading, isSaving, onStatus, onOpen, onClose, onResolve }) {
    const [comment, setComment] = useState('');
    const [hideMaterial, setHideMaterial] = useState(false);
    return (
        <>
            <div className="materials-admin__report-filter">
                <Select label="Статус жалоб" value={status} options={[{ value: '', label: 'Все' }, { value: 'pending', label: 'Новые' }, { value: 'resolved', label: 'Подтверждённые' }, { value: 'dismissed', label: 'Отклонённые' }]} onChange={(event) => onStatus(event.target.value)} />
            </div>
            {isLoading ? <Loader text="Загрузка жалоб..." /> : !reports.length ? <EmptyState title="Жалоб нет" description="В выбранной очереди нет обращений." /> : (
                <Table columns={columns} minWidth={900}>{reports.map((report) => (
                    <TableRow key={report.id}>
                        <TableCell>{report.id}</TableCell><TableCell strong>№{report.material_id} · {report.material_title}</TableCell><TableCell>{report.reporter_name}<small className="materials-admin__email">{report.reporter_email}</small></TableCell><TableCell>{reasonLabels[report.reason] || report.reason}</TableCell><TableCell><Badge variant={report.status === 'pending' ? 'warning' : report.status === 'resolved' ? 'success' : 'default'}>{report.status}</Badge></TableCell><TableCell><Button size="sm" variant="secondary" onClick={() => onOpen(report)}>Открыть</Button></TableCell>
                    </TableRow>
                ))}</Table>
            )}
            {selected && <Modal isOpen title={`Жалоба №${selected.id}`} description={selected.material_title} onClose={onClose} footer={selected.status === 'pending' ? <><Button variant="secondary" loading={isSaving} onClick={() => onResolve(selected.id, { decision: 'dismissed', comment: comment.trim(), hide_material: false })}>Не подтверждена</Button><Button variant="danger" loading={isSaving} onClick={() => onResolve(selected.id, { decision: 'resolved', comment: comment.trim(), hide_material: hideMaterial })}>Подтвердить</Button></> : null}>
                <div className="material-moderation"><p><strong>{reasonLabels[selected.reason] || selected.reason}</strong></p><p>{selected.comment || 'Без комментария'}</p>{selected.status === 'pending' && <><Input label="Решение администратора" multiline rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /><label className="materials-admin__check"><input type="checkbox" checked={hideMaterial} onChange={(event) => setHideMaterial(event.target.checked)} /> Скрыть материал и закрыть выданные доступы</label></>}</div>
            </Modal>}
        </>
    );
}
