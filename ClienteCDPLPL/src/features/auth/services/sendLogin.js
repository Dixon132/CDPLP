import axios from "axios";


const sendLogin = async (data, navigate) => {

    try {
            const response = await axios.post('/api/usuarios/auth/login', {
                correo: data.correo,
                contraseña: data.contraseña,
            });
            const { token } = response.data;
            localStorage.setItem('token', token);
            navigate('/dashboard');
        } catch (error) {
            console.error('Error al iniciar sesión:', error);

        }
    }

export default sendLogin;