import axios from "axios";
import { useEffect, useState } from 'react';
import Tables from "../../components/Tables";
const Tesoreria = () => {

    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        axios.get('/api/usuarios/usuario/').then((res) => {
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

export default Tesoreria;