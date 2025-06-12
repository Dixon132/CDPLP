

const Alerts = ({ type, message, onClose,show }) => {
    let bg, border, text, defaultMsg
    if(!show)   return null
    switch (type) {
        case 'success':
            bg = 'bg-green-100'
            border = 'border-green-400'
            text = 'text-green-700'
            defaultMsg = 'La operación se realizó con éxito.'
            break
        case 'error':
            bg = 'bg-red-100'
            border = 'border-red-400'
            text = 'text-red-700'
            defaultMsg = 'Ocurrió un error al realizar la operación.'
            break
        case 'warning':
            bg = 'bg-yellow-100'
            border = 'border-yellow-400'
            text = 'text-yellow-700'
            defaultMsg = 'Por favor, verifica los datos ingresados.'
            break
        default:
            return null
    }

    return (
        <div
            className={`${bg} ${border} ${text} px-4 py-3 rounded shadow-md fixed top-5 right-5 z-50 transition-all duration-300`}
            role="alert"
        >
            <strong className="font-bold mr-2">
                {type === 'success' ? '¡Éxito!' : type === 'error' ? '¡Error!' : '¡Advertencia!'}
            </strong>
            <span className="block sm:inline">{message ?? defaultMsg}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-0 bottom-0 right-0 px-4 py-3 text-xl"
                >
                    ×
                </button>
            )}
        </div>
    );
}

export default Alerts
