import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Select from "react-select";
import {
  getColegiadosReportSummary,
  getColegiadoReportDetail,
} from "../../../services/colegiados";
import { getColegiados } from "../../../services/ac-sociales";

export default function GenerarReporteColegios({ onClose }) {
  const [tipoReporte, setTipoReporte] = useState("resumen");
  const [opcionesColegios, setOpcionesColegios] = useState([]);
  const [seleccionColegiado, setSeleccionColegiado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOpciones, setLoadingOpciones] = useState(true);

  const { handleSubmit } = useForm();

  // Cargar opciones del select con mejor manejo de errores
  useEffect(() => {
    const fetchColegios = async () => {
      try {
        setLoadingOpciones(true);
        
        const lista = await getColegiados();
        
        if (!lista || !Array.isArray(lista)) {
          console.error("La respuesta no es un array válido:", lista);
          alert("Error: No se pudo cargar la lista de colegiados");
          return;
        }

        const opts = lista.map(c => {
           // 👈 Para ver la estructura
          return {
            value: c.id_colegiado, // 👈 Campo correcto
            label: `${c.apellido || c.Apellido || ''}, ${c.nombre || c.Nombre || ''}`.trim()
          };
        });
        
        setOpcionesColegios(opts);
        
      } catch (err) {
        console.error("Error cargando lista de colegiados:", err);
        alert("Error al cargar la lista de colegiados. Revisa la consola para más detalles.");
      } finally {
        setLoadingOpciones(false);
      }
    };
    
    fetchColegios();
  }, []);

  // Función mejorada para descargar PDF resumen
  const descargarResumen = async () => {
    try {
      setLoading(true);
      
      const response = await getColegiadosReportSummary();
      
      // Verificar si la respuesta es un blob o necesita conversión
      let blob;
      if (response instanceof Blob) {
        blob = response;
      } else if (response.data && response.data instanceof Blob) {
        blob = response.data;
      } else if (response.data) {
        blob = new Blob([response.data], { type: "application/pdf" });
      } else {
        blob = new Blob([response], { type: "application/pdf" });
      }

      // Crear y descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reporte_resumen_colegiados.pdf");
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      link.remove();
      window.URL.revokeObjectURL(url);
      
      
    } catch (err) {
      console.error("Error descargando resumen:", err);
      alert(`Error generando el resumen: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Función mejorada para descargar PDF individual
  const onSubmitIndividual = async () => {
    if (!seleccionColegiado) {
      alert("Debes seleccionar un colegiado.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Validación extra del ID
      if (!seleccionColegiado.value || seleccionColegiado.value === '' || seleccionColegiado.value === undefined) {
        throw new Error(`ID del colegiado no válido: ${seleccionColegiado.value}`);
      }
      
      const response = await getColegiadoReportDetail(seleccionColegiado.value);
      
      // Verificar si la respuesta es un blob o necesita conversión
      let blob;
      if (response instanceof Blob) {
        blob = response;
      } else if (response.data && response.data instanceof Blob) {
        blob = response.data;
      } else if (response.data) {
        blob = new Blob([response.data], { type: "application/pdf" });
      } else {
        blob = new Blob([response], { type: "application/pdf" });
      }

      // Crear y descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Nombre de archivo seguro
      const safeName = seleccionColegiado.label
        .replace(/[^a-zA-Z0-9\s]/g, '') // Quitar caracteres especiales
        .replace(/\s+/g, "_"); // Reemplazar espacios con guiones bajos
      
      link.setAttribute("download", `reporte_colegiado_${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      link.remove();
      window.URL.revokeObjectURL(url);
      
      
    } catch (err) {
      console.error("Error descargando reporte individual:", err);
      alert(`Error generando el reporte individual: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full mx-auto">
      <h2 className="text-xl font-semibold text-center mb-4">
        Generar Reporte de Colegiados
      </h2>

      {/* Botones para elegir tipo de reporte */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setTipoReporte("resumen")}
          disabled={loading}
          className={`px-4 py-2 rounded ${
            tipoReporte === "resumen"
              ? "bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px] shadow-sm"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Resumen
        </button>
        <button
          onClick={() => setTipoReporte("individual")}
          disabled={loading}
          className={`px-4 py-2 rounded ${
            tipoReporte === "individual"
              ? "bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px] shadow-sm"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Individual
        </button>
      </div>

      {/* Sección Resumen */}
      {tipoReporte === "resumen" && (
        <div className="pt-4 text-center">
          <p className="mb-4">
            Este reporte generará un PDF con el total de colegiados "Activos" vs "Inactivos".
          </p>
          <button
            onClick={descargarResumen}
            disabled={loading}
            className={`bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Generando..." : "Descargar Resumen PDF"}
          </button>
        </div>
      )}

      {/* Sección Individual con react-select */}
      {tipoReporte === "individual" && (
        <form onSubmit={handleSubmit(onSubmitIndividual)} className="pt-4 space-y-4">
          <div>
            <label className="block font-semibold mb-1">
              Seleccione un Colegiado
            </label>
            {loadingOpciones ? (
              <div className="text-center py-2">Cargando opciones...</div>
            ) : (
              <Select
                options={opcionesColegios}
                value={seleccionColegiado}
                onChange={setSeleccionColegiado}
                placeholder="-- Elige un colegiado --"
                isClearable
                isDisabled={loading}
                noOptionsMessage={() => "No se encontraron colegiados"}
                loadingMessage={() => "Cargando..."}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !seleccionColegiado}
            className={`bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all ${
              loading || !seleccionColegiado ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Generando..." : "Descargar Reporte Individual"}
          </button>
        </form>
      )}

      {/* Botón Cerrar */}
      <div className="text-right">
        <button
          onClick={onClose}
          disabled={loading}
          className={`mt-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
