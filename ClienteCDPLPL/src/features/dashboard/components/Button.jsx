export const Button = ({ className = '', onClick, type = 'button', children }) => {

    return (
        <button
            type={type}
            onClick={onClick}
            className={`mx-1.5 px-3 py-1.5 rounded-4xl  text-black transition ${className}`}
        >
            {children}
        </button>
    );
};
