// Página de gestión de la Biblioteca de Escenarios (Req. 29).
// Lista los escenarios existentes y permite sembrar los predefinidos.
import { useState } from 'react';
import { QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gdsQueryClient } from '../lib/queryClient';
import { listEscenarios, type Escenario } from '../api/escenariosApi';
import gdsApiClient from '../api/client.js';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

function sembrarEscenarios(): Promise<unknown> {
    return gdsApiClient.post('/escenarios/seed');
}

function BibliotecaEscenarios() {
    const queryClient = useQueryClient();
    const [msg, setMsg] = useState('');

    const escQuery = useQuery({
        queryKey: ['gds', 'escenarios'],
        queryFn: listEscenarios,
    });

    const seed = useMutation({
        mutationFn: sembrarEscenarios,
        onSuccess: () => {
            setMsg('Escenarios predefinidos sembrados correctamente.');
            void queryClient.invalidateQueries({ queryKey: ['gds', 'escenarios'] });
        },
        onError: () => setMsg('Error al sembrar escenarios.'),
    });

    const escenarios: Escenario[] = escQuery.data?.escenarios ?? [];

    return (
        <section className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">
                        Biblioteca de Escenarios
                    </h2>
                    <p className="mt-1 text-slate-600">
                        Escenarios reutilizables para configurar estudios longitudinales.
                    </p>
                </div>
                <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
                    {seed.isPending ? 'Sembrando…' : 'Sembrar predefinidos'}
                </Button>
            </div>

            {msg && (
                <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {msg}
                </div>
            )}

            {escQuery.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

            {escenarios.length === 0 && !escQuery.isLoading ? (
                <Card className="p-6 text-center text-slate-500">
                    No hay escenarios en la biblioteca. Pulsa "Sembrar predefinidos" para
                    cargar los escenarios de ejemplo.
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {escenarios.map((esc) => (
                        <Card key={esc.id ?? esc.nombre} className="p-4">
                            <h3 className="font-medium text-slate-800">{esc.nombre}</h3>
                            {esc.descripcion && (
                                <p className="mt-1 text-sm text-slate-600 line-clamp-3">
                                    {esc.descripcion}
                                </p>
                            )}
                            <div className="mt-2 flex gap-2 text-xs text-slate-400">
                                {esc.categoria && <span className="capitalize">{esc.categoria}</span>}
                                {esc.es_predefinido && <span>· predefinido</span>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function GdsEscenarios() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <BibliotecaEscenarios />
        </QueryClientProvider>
    );
}
