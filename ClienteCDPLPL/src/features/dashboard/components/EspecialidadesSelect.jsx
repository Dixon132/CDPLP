import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search } from 'lucide-react';
import {
  getAllEspecialidades,
  createEspecialidad,
} from '../services/especialidades';

/**
 * EspecialidadesSelect
 *
 * Multi-select de especialidades con búsqueda y chips.
 * Si allowCreate=true, muestra un botón "+ Nueva" para crear inline.
 *
 * Props:
 *  - value:       string[]  — nombres de especialidades seleccionadas
 *  - onChange:    (string[]) => void
 *  - allowCreate: boolean   — habilita creación inline
 */
export default function EspecialidadesSelect({ value = [], onChange, allowCreate = false }) {
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const containerRef = useRef(null);

  // Cargar especialidades activas al montar
  useEffect(() => {
    setCargando(true);
    getAllEspecialidades()
      .then((res) => {
        const data = res.data ?? [];
        setOpciones(data);
      })
      .catch(() => {
        setOpciones([]);
      })
      .finally(() => setCargando(false));
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const opcionesFiltradas = opciones.filter(
    (op) =>
      op.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      !value.includes(op.nombre)
  );

  function seleccionar(nombre) {
    onChange([...value, nombre]);
    setBusqueda('');
  }

  function quitar(nombre) {
    onChange(value.filter((v) => v !== nombre));
  }

  async function handleCrearNueva() {
    if (!nuevaNombre.trim()) return;
    setGuardando(true);
    try {
      await createEspecialidad({ nombre: nuevaNombre.trim() });
      // Refrescar lista
      const res = await getAllEspecialidades();
      const data = res.data ?? [];
      setOpciones(data);
      // Seleccionar la recién creada
      onChange([...value, nuevaNombre.trim()]);
      setNuevaNombre('');
      setCreando(false);
    } catch {
      // silenciar; el formulario padre puede manejar el error
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Chips de seleccionadas */}
      <div
        className="min-h-[40px] flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md bg-white cursor-text"
        onClick={() => setAbierto(true)}
      >
        {value.map((nombre) => (
          <span
            key={nombre}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {nombre}
            <button
              type="button"
              aria-label={`Quitar ${nombre}`}
              onClick={(e) => {
                e.stopPropagation();
                quitar(nombre);
              }}
              className="hover:text-blue-600"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {value.length === 0 && !abierto && (
          <span className="text-gray-400 text-sm select-none">
            {cargando ? 'Cargando…' : 'Seleccionar especialidades…'}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Buscador */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar especialidad…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
          </div>

          {/* Lista de opciones */}
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Especialidades disponibles">
            {opcionesFiltradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">
                {cargando ? 'Cargando…' : 'Sin resultados'}
              </li>
            ) : (
              opcionesFiltradas.map((op) => (
                <li
                  key={op.nombre}
                  role="option"
                  aria-selected={false}
                  onClick={() => seleccionar(op.nombre)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                >
                  {op.nombre}
                </li>
              ))
            )}
          </ul>

          {/* Botón "+ Nueva" */}
          {allowCreate && (
            <div className="border-t border-gray-100 p-2">
              {creando ? (
                <div className="flex gap-2 items-center">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre de la nueva especialidad"
                    value={nuevaNombre}
                    onChange={(e) => setNuevaNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCrearNueva()}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCrearNueva}
                    disabled={guardando || !nuevaNombre.trim()}
                    className="px-2 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {guardando ? '…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreando(false); setNuevaNombre(''); }}
                    className="px-2 py-1 text-sm text-gray-500"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreando(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Plus size={14} />
                  Nueva especialidad
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
