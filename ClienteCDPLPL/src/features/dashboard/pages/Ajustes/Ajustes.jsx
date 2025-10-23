const Ajustes = () => {
    console.log('Ajustes component rendered');
    return (
        <div>
            Ajustes
            <h1 className="text-2xl font-bold mb-4">Ajustes</h1>
            <p className="text-gray-600">Aquí puedes ajustar la configuración de la aplicación.</p>
            <div className="mt-4">
                <h2 className="text-xl font-semibold">Configuración de la cuenta</h2>
                <p className="text-gray-600">Gestiona tu información personal y preferencias.</p>
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-semibold">Notificaciones</h2>
                <p className="text-gray-600">Configura tus preferencias de notificación.</p>
            </div>
        </div>
    );
};

export default Ajustes;