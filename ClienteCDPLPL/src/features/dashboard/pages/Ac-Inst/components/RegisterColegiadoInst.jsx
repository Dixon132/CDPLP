// src/pages/dashboard/pages/Ac-institucionales/RegisterColegiadoInst.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Select from "react-select";
import {
  registerColegiadoInstitucional,
} from "../../../services/ac-institucionales";
import { getColegiados, getInvitados } from "../../../services/ac-sociales";

import {
  UserPlus,
  Users,
  UserCheck,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Zap,
  Star,
  Rocket,
  PartyPopper,
  Crown,
  Award,
  Gift,
  Heart,
  Flame
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Observamos estas dos para resetear mutuamente
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

    setLoading(true);

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
      setShowSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Error al registrar colegiado/invitado");
    } finally {
      setLoading(false);
    }
  };

  // Custom styles para react-select
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      padding: '8px',
      color: 'white',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(147, 51, 234, 0.5)' : 'none',
      '&:hover': {
        borderColor: 'rgba(147, 51, 234, 0.5)',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: 'white',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'rgba(255, 255, 255, 0.6)',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'white',
    }),
    menu: (provided) => ({
      ...provided,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      overflow: 'hidden',
    }),
    option: (provided, state) => ({
      ...provided,
      background: state.isSelected
        ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
        : state.isFocused
          ? 'rgba(139, 92, 246, 0.2)'
          : 'transparent',
      color: 'white',
      padding: '12px 16px',
      '&:hover': {
        background: 'rgba(139, 92, 246, 0.3)',
      },
    }),
  };

  if (showSuccess) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur opacity-75 animate-pulse"></div>
            <div className="relative p-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-xl">
              <PartyPopper className="w-16 h-16 text-white animate-bounce" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
            ¡Registro Exitoso!
          </h3>
          <p className="text-gray-300 text-lg">
            El participante ha sido registrado correctamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[500px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-8">
        {/* Ultra Creative Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-75 animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl">
                <UserPlus className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200">
                Registro
              </h2>
              <p className="text-gray-300 font-medium">Inscribe participantes</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          {/* Colegiados Section */}
          <div className="relative z-10 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <label className="text-xl font-bold text-white mb-1 block">
                    Seleccionar Colegiado
                  </label>
                  <p className="text-gray-300 text-sm">Miembros oficiales del colegio</p>
                </div>
              </div>

              <Select
                options={colegiados}
                onChange={(option) => {
                  setValue("id_colegiado", option);
                  setValue("id_invitado", null);
                }}
                value={selectedColegiado}
                isClearable
                placeholder="🔍 Busca o elige un colegiado..."
                styles={customSelectStyles}
                className="text-white"
              />

              {selectedColegiado && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-200 font-semibold">
                      {selectedColegiado.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-full shadow-xl">
              <span className="text-white font-bold flex items-center gap-2">

                O

              </span>
            </div>
          </div>

          {/* Invitados Section */}
          <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-red-500/20"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl shadow-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <label className="text-xl font-bold text-white mb-1 block">
                    Seleccionar Invitado
                  </label>
                  <p className="text-gray-300 text-sm">Participantes externos invitados</p>
                </div>
              </div>

              <Select
                options={invitados}
                onChange={(option) => {
                  setValue("id_invitado", option);
                  setValue("id_colegiado", null);
                }}
                value={selectedInvitado}
                isClearable
                placeholder="🎁 Busca o elige un invitado..."
                styles={customSelectStyles}
                className="text-white"
              />

              {selectedInvitado && (
                <div className="mt-4 p-4 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-2xl border border-pink-500/30">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-pink-400" />
                    <span className="text-pink-200 font-semibold">
                      {selectedInvitado.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <CreditCard className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <label className="text-xl font-bold text-white mb-1 block">
                    Método de Pago
                  </label>
                  <p className="text-gray-300 text-sm">Selecciona cómo procesaremos el pago</p>
                </div>
              </div>

              <div className="relative">
                <select
                  {...register("metodo_pago", { required: true })}
                  className="w-full px-6 py-4 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 transition-all duration-300 appearance-none cursor-pointer"
                >
                  <option value="">Seleccione método de pago...</option>
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="OTRO">OTRO</option>
                </select>
                <DollarSign className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              {errors.metodo_pago && (
                <div className="mt-3 flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-semibold">Método de pago obligatorio</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative px-12 py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl font-bold text-white shadow-2xl shadow-yellow-500/50 hover:shadow-yellow-500/75 transform hover:scale-105 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Registrando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 animate-bounce" />
                    Registrar Inscripcion
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}