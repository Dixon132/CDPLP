import axios from "axios";
import { useEffect, useState } from 'react';
import Tables from "../../components/Tables";
import { useAxiosInterceptor } from "../../../../hooks/useAxiosInterceptor";
import { getAllActiveUsuarios } from "../../services/usuarios";
const Usuarios = () => {
    useEffect(() => {
        // función interna async para poder usar await
        async function fetchUsuarios() {
            const data = await getAllActiveUsuarios();
            console.log(data)
        }
        fetchUsuarios();
    }, []);
    return(
        <table>
            <thead>
                <tr>
                    <th>
                        
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        
                    </td>
                </tr>
            </tbody>
        </table>
    )
};

export default Usuarios;