/**
 * DTO de edicion de un `Escenario_Reutilizable`.
 *
 * Editar NO muta la version previa: el `Motor_Escenarios` crea una NUEVA
 * version con los cambios. Todos los campos son OPCIONALES (solo se versionan
 * los que el usuario modifica). `PartialType` reutiliza las validaciones y la
 * documentacion Swagger de `CrearEscenarioDto`.
 *
 * _Requirements: 29.5, 29.6, 40.5_
 */
import { PartialType } from '@nestjs/swagger';

import { CrearEscenarioDto } from './crear-escenario.dto';

export class EditarEscenarioDto extends PartialType(CrearEscenarioDto) { }
