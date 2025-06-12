// src/pages/dashboard/pages/Ac-institucionales/RegisterColegiadoInst.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Select from "react-select";
import {
  registerColegiadoInstitucional,
} from "../../../services/ac-institucionales";
import { getColegiados, getInvitados } from "../../../services/ac-sociales";

export default function RegisterColegiadoInst({ id, onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const [colegiados, setColegiados] = useState([]);
  const [invitados, setInvitados] = useState([]);

  // Observamos estas dos para resetar mutuamente
  const selectedColegiado = watch("id_colegiado");
  const selectedInvitado = watch("id_invitado");

  useEffect(() => {
    // 1) Cargar lista de colegiados
    const fetchColegiados = async () => {
      const cols = await getColegiados();
      setColegiados(
        cols.map((c) => ({
          value: c.id_colegiado,
          label: `${c.nombre} ${c.apellido}`,
          especialidades: c.especialidades,
        }))
      );
    };
    // 2) Cargar lista de invitados
    const fetchInvitados = async () => {
      const invs = await getInvitados();
      setInvitados(
        invs.map((i) => ({
          value: i.id_invitado,
          label: `${i.nombre} ${i.apellido}`,
          tipo: i.tipo,
        }))
      );
    };
    fetchColegiados();
    fetchInvitados();
  }, []);

  const onSubmit = async (data) => {
    // Validaciones básicas:
    if (!data.id_colegiado && !data.id_invitado) {
      alert("Debes seleccionar un colegiado o un invitado.");
      return;
    }
    if (data.id_colegiado && data.id_invitado) {
      alert("Solo puedes registrar un colegiado o un invitado, no ambos.");
      return;
    }

    // Construir payload para el backend
    const payload = {
      id_actividad: id,
      id_colegiado: data.id_colegiado ? data.id_colegiado.value : null,
      id_invitado: data.id_invitado ? data.id_invitado.value : null,
      fecha_registro: new Date(), // o déjalo que el backend lo complete con now()
      estado_registro: "REGISTRADO",
      metodo_pago: data.metodo_pago || "EFECTIVO",
    };

    try {
      await registerColegiadoInstitucional(payload);
      alert("Registro exitoso");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("Error al registrar colegiado/invitado");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 max-w-lg mx-auto"
    >
      <div>
        <label className="block font-semibold">Seleccionar Colegiado</label>
        <Select
          options={colegiados}
          onChange={(option) => {
            setValue("id_colegiado", option);
            setValue("id_invitado", null);
          }}
          value={selectedColegiado}
          isClearable
          placeholder="Busca o elige un colegiado..."
        />
      </div>

      <div>
        <label className="block font-semibold">Seleccionar Invitado</label>
        <Select
          options={invitados}
          onChange={(option) => {
            setValue("id_invitado", option);
            setValue("id_colegiado", null);
          }}
          value={selectedInvitado}
          isClearable
          placeholder="Busca o elige un invitado..."
        />
      </div>

      <div>
        <label className="block font-semibold">Método de pago</label>
        <select
          {...register("metodo_pago", { required: true })}
          className="w-full border px-4 py-2 rounded"
        >
          <option value="">Seleccione...</option>
          <option value="EFECTIVO">EFECTIVO</option>
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>
          <option value="OTRO">OTRO</option>
        </select>
        {errors.metodo_pago && (
          <p className="text-red-500">Método de pago obligatorio</p>
        )}
      </div>

      <button
        type="submit"
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
      >
        Registrar
      </button>
    </form>
  );
}
