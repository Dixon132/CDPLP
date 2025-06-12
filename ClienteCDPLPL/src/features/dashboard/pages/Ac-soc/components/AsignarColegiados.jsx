import { useForm } from "react-hook-form";
import Select from "react-select";
import { useEffect, useState } from "react";
import { asignarColegiado, getColegiados, getInvitados } from "../../../services/ac-sociales";


const AsignarColegiados = ({ id }) => {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
    const [colegiados, setColegiados] = useState([]);
    const [invitados, setInvitados] = useState([]);

    const selectedColegiado = watch("id_colegiado");
    const selectedInvitado = watch("id_invitado");

    useEffect(() => {
        const fetchData = async () => {
            const col = await getColegiados();
            const inv = await getInvitados();

            // Transformar a opciones de react-select
            setColegiados(col.map(c => ({ value: c.id_colegiado, label: `${c.nombre} ${c.apellido}` })));
            setInvitados(inv.map(i => ({ value: i.id_invitado, label: `${i.nombre} ${i.apellido}` })));
        };
        fetchData();
    }, []);

    const onSubmit = async (data) => {
        if (!data.id_colegiado && !data.id_invitado) {
            alert("Debes seleccionar un colegiado o un invitado.");
            return;
        }

        if (data.id_colegiado && data.id_invitado) {
            alert("Solo puedes seleccionar un colegiado o un invitado, no ambos.");
            return;
        }

        const body = {
            id_actividad_social: id,
            id_colegiado: data.id_colegiado?.value || null,
            id_invitado: data.id_invitado?.value || null,
        };

        await asignarColegiado(body);
        alert("Asignado correctamente");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 max-w-xl mx-auto">
            <div>
                <label className="font-semibold block">Seleccionar Colegiado</label>
                <Select
                    options={colegiados}
                    onChange={(option) => {
                        setValue("id_colegiado", option);
                        setValue("id_invitado", null); // resetea invitado si se selecciona colegiado
                    }}
                    value={selectedColegiado}
                    isClearable
                />
            </div>

            <div>
                <label className="font-semibold block">Seleccionar Invitado</label>
                <Select
                    options={invitados}
                    onChange={(option) => {
                        setValue("id_invitado", option);
                        setValue("id_colegiado", null); // resetea colegiado si se selecciona invitado
                    }}
                    value={selectedInvitado}
                    isClearable
                />
            </div>

            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Asignar
            </button>
        </form>
    );
};

export default AsignarColegiados;
