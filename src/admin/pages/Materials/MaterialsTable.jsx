import { Badge, Button, EmptyState, Loader, Table, TableCell, TableRow } from '../../components/ui/index.js';

const LABELS = { private: 'Личное', pending: 'На модерации', approved: 'Опубликовано', rejected: 'Отклонено', hidden: 'Скрыто' };
const VARIANTS = { pending: 'warning', approved: 'success', rejected: 'danger', hidden: 'default', private: 'default' };
const columns = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'title', label: 'Материал' },
    { key: 'subject', label: 'Предмет' },
    { key: 'author', label: 'Автор' },
    { key: 'access', label: 'Доступ' },
    { key: 'status', label: 'Статус' },
    { key: 'updated', label: 'Изменён' },
    { key: 'action', label: 'Действие', width: '110px' },
];

export function MaterialsTable({ materials, isLoading, onOpen }) {
    if (isLoading) return <Loader text="Загрузка материалов..." />;
    if (!materials.length) return <EmptyState title="Материалы не найдены" description="В выбранной очереди нет материалов." />;
    return (
        <Table columns={columns} minWidth={1050}>
            {materials.map((material) => (
                <TableRow key={material.id}>
                    <TableCell>{material.id}</TableCell>
                    <TableCell strong>{material.title}</TableCell>
                    <TableCell>{material.subject}</TableCell>
                    <TableCell>{material.author}<small className="materials-admin__email">{material.creator_email}</small></TableCell>
                    <TableCell>{material.access_type === 'paid' ? `${material.price_rub} ₽` : 'Бесплатно'}</TableCell>
                    <TableCell><Badge variant={VARIANTS[material.publication_status] || 'default'}>{LABELS[material.publication_status] || material.publication_status}</Badge></TableCell>
                    <TableCell>{new Date(material.updated_at).toLocaleString('ru-RU')}</TableCell>
                    <TableCell><Button size="sm" variant="secondary" onClick={() => onOpen(material)}>Открыть</Button></TableCell>
                </TableRow>
            ))}
        </Table>
    );
}
