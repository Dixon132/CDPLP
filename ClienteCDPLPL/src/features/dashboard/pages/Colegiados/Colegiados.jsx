import axios from "axios";
import { useEffect, useState } from 'react';
import Tables from "../../components/Tables";
const Colegiados = () => {

    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        axios.get('/api/colegiados/colegiado/').then((res) => {
            setUsuarios(res.data);
        });
    }, []);

    const handleEdit = (item) => console.log('Editar usuario', item);
    const handleDelete = (item) => console.log('Eliminar usuario', item);
    const handleCreate = () => console.log('Crear usuario');

    return (
        <Tables
            data={usuarios}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={handleCreate}
        />
    );
};

export default Colegiados