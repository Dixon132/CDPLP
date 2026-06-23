/**
 * DTO de edicion de una `Institucion` (endpoint `PUT /api/gds/instituciones/:id`).
 *
 * Hereda de `CrearInstitucionDto` via `PartialType`, de modo que todos los
 * campos son opcionales y se actualiza unicamente lo provisto, conservando las
 * mismas reglas de validacion (categoria, coordenadas, radio) y la
 * documentacion Swagger (Req. 7.5).
 *
 * _Requirements: 7.2, 7.3, 7.4, 7.5, 40.4_
 */
import { PartialType } from '@nestjs/swagger';

import { CrearInstitucionDto } from './crear-institucion.dto';

export class ActualizarInstitucionDto extends PartialType(CrearInstitucionDto) { }
