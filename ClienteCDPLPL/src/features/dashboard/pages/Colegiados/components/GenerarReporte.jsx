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
        console.log("Cargando lista de colegiados...");
        
        const lista = await getColegiados();
        console.log("Lista recibida:", lista);
        
        if (!lista || !Array.isArray(lista)) {
          console.error("La respuesta no es un array válido:", lista);
          alert("Error: No se pudo cargar la lista de colegiados");
          return;
        }

        const opts = lista.map(c => {
          console.log("Mapeando colegiado:", c); // 👈 Para ver la estructura
          return {
            value: c.id_colegiado, // 👈 Campo correcto
            label: `${c.apellido || c.Apellido || ''}, ${c.nombre || c.Nombre || ''}`.trim()
          };
        });
        
        console.log("Opciones mapeadas:", opts);
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
      console.log("Iniciando descarga de resumen...");
      
      const response = await getColegiadosReportSummary();
      console.log("Respuesta del servicio resumen:", response);
      
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
      
      console.log("Descarga completada");
      
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
      console.log("Descargando reporte para colegiado:", seleccionColegiado);
      console.log("ID enviado:", seleccionColegiado.value, "Tipo:", typeof seleccionColegiado.value);
      
      // Validación extra del ID
      console.log("Objeto completo seleccionado:", seleccionColegiado);
      if (!seleccionColegiado.value || seleccionColegiado.value === '' || seleccionColegiado.value === undefined) {
        throw new Error(`ID del colegiado no válido: ${seleccionColegiado.value}`);
      }
      
      const response = await getColegiadoReportDetail(seleccionColegiado.value);
      console.log("Respuesta del servicio individual:", response);
      
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
      
      console.log("Descarga individual completada");
      
    } catch (err) {
      console.error("Error descargando reporte individual:", err);
      alert(`Error generando el reporte individual: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded shadow-lg max-w-xl mx-auto">
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
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-black hover:bg-gray-300"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Resumen
        </button>
        <button
          onClick={() => setTipoReporte("individual")}
          disabled={loading}
          className={`px-4 py-2 rounded ${
            tipoReporte === "individual"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-black hover:bg-gray-300"
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
            className={`bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded ${
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
            className={`bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded ${
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
          className={`mt-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}