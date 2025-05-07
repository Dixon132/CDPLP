const ButtonCreate = ({onClick,children}) => {

    return (
        <button className="bg-cyan-500 hover:bg-cyan-600 rounded-4xl py-2 px-3 mb-3" onClick={onClick}>{children}</button>
    );
};

export default ButtonCreate;