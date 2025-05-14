import { useParams } from "react-router-dom";

const Pagos = () => {
    const {id} = useParams()
    const pagos = []
    return (
        <div className="border-4 border-gray-500 min-h-80 h-auto my-5 rounded-3xl">
            <div className="text-center border-b h-10 flex justify-center items-center">
                <h2 className="font-bold text-1xl">Pagos</h2>
            </div>
            <div className="p-5">
                {pagos.map((doc, i)=>{
                    
                })}
            </div>
        </div>
    );
};

export default Pagos;