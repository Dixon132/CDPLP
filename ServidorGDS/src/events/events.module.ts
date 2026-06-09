import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Events module: bus de eventos interno (Event-Driven) basado en el
 * `EventEmitter` de NestJS. Se reexporta para que los modulos de dominio
 * publiquen/consuman eventos sin acoplarse entre si.
 */
@Module({
    imports: [EventEmitterModule.forRoot()],
})
export class EventsModule { }
