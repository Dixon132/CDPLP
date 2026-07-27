import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Building2 } from 'lucide-react';
import {
  getInstituciones,
  createInstitucion,
} from '../services/instituciones';

/**
 * InstitucionesSelect
 *
 * Single-select de instituciones con búsqueda.
 * Si allowCreate=true, muestra un botón "+ Nueva" para crear inline.
 */
export default function InstitucionesSelect({ value = "", onChange, error = false, allowCreate = true }) {
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setCargando(true);
    getInstituciones()
      .then((res) => {
        setOpciones(res ?? []);
      })
      .catch(() => {
        setOpciones([]);
      })
      .finally(() => setCargando(false));
  }, []);

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
      op.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  function seleccionar(nombre) {
    onChange(nombre);
    setBusqueda('');
    setAbierto(false);
  }

  function quitar() {
    onChange("");
  }

  async function handleCrearNueva() {
    if (!nuevaNombre.trim()) return;
    setGuardando(true);
    try {
      await createInstitucion({ nombre: nuevaNombre.trim() });
      const res = await getInstituciones();
      setOpciones(res ?? []);
      onChange(nuevaNombre.trim());
      setNuevaNombre('');
      setCreando(false);
      setAbierto(false);
    } catch {
      // ignore
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`min-h-[56px] flex items-center justify-between gap-1 p-2 border ${error ? 'border-red-500' : 'border-gray-300'} hover:border-gray-800 rounded-md bg-white cursor-pointer transition`}
        onClick={() => setAbierto(true)}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden px-2">
            {value ? (
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{value}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); quitar(); }}
                        className="text-indigo-400 hover:text-indigo-600 rounded-full p-0.5 hover:bg-indigo-100 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <span className="text-gray-500 text-base">Seleccionar institución...</span>
            )}
        </div>
      </div>

      {abierto && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 flex flex-col">
          {/* Header Búsqueda */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar institución..."
              className="flex-1 text-sm outline-none bg-transparent"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 p-1">
            {cargando && (
              <div className="p-4 text-center text-sm text-gray-500">Cargando...</div>
            )}
            {!cargando && opcionesFiltradas.length === 0 && !creando && (
              <div className="p-4 text-center text-sm text-gray-500">
                No se encontraron resultados
              </div>
            )}
            {!cargando &&
              !creando &&
              opcionesFiltradas.map((op) => (
                <button
                  key={op.id_institucion}
                  type="button"
                  onClick={() => seleccionar(op.nombre)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition"
                >
                  {op.nombre}
                </button>
              ))}

            {/* Form Crear */}
            {creando && (
              <div className="p-3 bg-gray-50 rounded-md mt-1 border border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva institución</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                    placeholder="Ej. UMSA"
                    value={nuevaNombre}
                    onChange={(e) => setNuevaNombre(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCrearNueva}
                    disabled={guardando || !nuevaNombre.trim()}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreando(false);
                      setNuevaNombre('');
                    }}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                  >
                    X
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Add */}
          {allowCreate && !creando && (
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
              >
                <Plus className="w-4 h-4" /> Agregar nueva
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
