import { Pagination } from '../../components/ui/index.js';
import { useAdminMaterials } from '../../hooks/useAdminMaterials.js';
import { MaterialModerationModal } from './MaterialModerationModal.jsx';
import { MaterialReports } from './MaterialReports.jsx';
import { MaterialsTable } from './MaterialsTable.jsx';
import { MaterialsToolbar } from './MaterialsToolbar.jsx';

import './materials.css';

export function MaterialsPage() {
    const controller = useAdminMaterials();
    return (
        <div className="admin-page materials-admin">
            <div className="materials-admin__tabs">
                <button type="button" className={controller.mode === 'materials' ? 'active' : ''} onClick={() => controller.changeMode('materials')}>Модерация материалов</button>
                <button type="button" className={controller.mode === 'reports' ? 'active' : ''} onClick={() => controller.changeMode('reports')}>Жалобы</button>
            </div>
            {controller.error && <div className="admin-alert">{controller.error}</div>}
            {controller.notice && <div className="admin-alert materials-admin__success">{controller.notice}</div>}
            {controller.mode === 'materials' ? <>
                <MaterialsToolbar filters={controller.filters} onChange={controller.updateFilters} onReset={() => controller.updateFilters({ q: '', status: 'pending' })} onRefresh={controller.refresh} />
                <MaterialsTable materials={controller.materials} isLoading={controller.isLoading} onOpen={controller.openMaterial} />
                <MaterialModerationModal key={controller.selectedMaterial?.id || 'closed'} material={controller.selectedMaterial} isSaving={controller.isSaving} onClose={controller.closeMaterial} onModerate={controller.moderate} onDownload={controller.download} />
            </> : <MaterialReports key={`${controller.reportStatus}:${controller.selectedReport?.id || 'none'}`} reports={controller.reports} status={controller.reportStatus} selected={controller.selectedReport} isLoading={controller.isLoading} isSaving={controller.isSaving} onStatus={controller.setReportStatus} onOpen={controller.openReport} onClose={controller.closeReport} onResolve={controller.resolveReport} />}
            <Pagination page={controller.pagination.page} pages={controller.pagination.pages} total={controller.pagination.total} onPageChange={controller.changePage} />
        </div>
    );
}
