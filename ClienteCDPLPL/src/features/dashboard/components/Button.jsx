export const Button = ({className='',onClick,type = 'button', children}) => {

    return (
        <button
        type={type}
        onClick={onClick}
        className={`px-3 py-1.5 rounded-4xl  text-black transition ${className}`}
        >
            {children}
        </button>
    );
};

export const ButtonCreate = ({onClick,children}) => {

    return (
        <button className="bg-cyan-500 hover:bg-cyan-600 rounded-4xl py-2 px-3 mb-3" onClick={onClick}>{children}</button>
    );
};

