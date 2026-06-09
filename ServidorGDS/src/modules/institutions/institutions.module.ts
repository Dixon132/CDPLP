import { Module } from '@nestjs/common';

import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

/**
 * Institutions: `Gestor_Instituciones` y geolocalizacion (Req. 25.2).
 *
 * Registra el `InstitutionsService` (CRUD + restriccion atomica de borrado +
 * auditoria) sobre el `PrismaService` global y expone el
 * `InstitutionsController` bajo `/api/gds/institutions`. El servicio se exporta
 * para que otros modulos de dominio (p. ej. `Analysis`) puedan reutilizarlo.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 25.2_
 */
@Module({
    controllers: [InstitutionsController],
    providers: [InstitutionsService],
    exports: [InstitutionsService],
})
export class InstitutionsModule { }
