const Tables = ({ data = [], onEdit, onDelete, onCreate }) => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-4 text-white">Tabla</h1>

            <button
                onClick={onCreate}
                className="mb-4 bg-gray-700 text-white px-4 py-2 rounded-4xl hover:bg-blue-600"
            >
                Crear nuevo
            </button>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr className="">
                            {headers.map((header) => (
                                <th key={header} className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                                    {header}
                                </th>
                            ))}
                            <th className="py-3 px-6 text-left">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                                {headers.map((key) => (
                                    <td key={key} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                        {item[key]}
                                    </td>
                                ))}
                                <td className="py-3 px-6 flex gap-2">
                                    <button
                                        onClick={() => onEdit?.(item)}
                                        className="bg-black  text-white px-2 py-1 rounded-4xl hover:bg-white hover:text-black border border-black"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(item)}
                                        className="bg-white text-black px-2 py-1 rounded-4xl hover:bg-black hover:text-white border border-black"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default Tables;