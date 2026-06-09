import { Module } from '@nestjs/common';

import { ReportsController } from './reports.controller';
import { ReportsExportService } from './reports.export.service';
import { ReportsService } from './reports.service';

/**
 * Reports: `Generador_Reportes` (Req. 19, 25.2).
 *
 * Registra el `ReportsService` (generacion por horizonte semanal/mensual/
 * trimestral/semestral/final desde los resultados semanales acumulados, con
 * narrativa Handlebars) sobre el `PrismaService` global, y su API HTTP
 * (`ReportsController`). El `ReportsExportService` (tarea 23.2) anade el render
 * descargable (PDF con PDFKit, Excel con ExcelJS, diseno D13) reutilizando el
 * `ReporteContenido` que el `ReportsService` persiste en `gds_reporte`,
 * conservando explicaciones y evidencias anonimizadas (Req. 19.5).
 */
@Module({
    controllers: [ReportsController],
    providers: [ReportsService, ReportsExportService],
    exports: [ReportsService, ReportsExportService],
})
export class ReportsModule { }
