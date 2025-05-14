export const Tables = ({ children }) => {

    return (
        <div className="my-1 overflow-x-scroll rounded-xl overflow-hidden border border-gray-300">
            <table className=" min-w-full divide-y divide-gray-300">
                {children}
            </table>
        </div>

    )
}
export const THead = ({ th }) => {
    return (
        <thead className="bg-gray-50">
            <tr>
                {th.map((i, index) => (
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900" key={index}>{i}</th>
                ))}
                <th>Acciones</th>
            </tr>
        </thead>

    )
}
export const TBody = ({ children }) => {

    return (
        <tbody className="divide-y divide-gray-200 bg-white">
            {children}
        </tbody>
    )
}
export const Td = ({ children, estado }) => {
    if (estado) {
        return (
            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                    {children}
                </span>
            </td>
        )
    }
    return (
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{children}</td>
    )
}
export const H1 = ({ children }) => {
    return (
        <h1 className="my-1 text-2xl w-full text-center">{children}</h1>
    )
}
export const Tfooter = ({ total, totalPage, Page }) => {
    return (
        <tfoot className="font-semibold w-full">
            <tr className="h-14 w-full bg-gray-50 text-sm text-gray-700">
                <td className="px-4 py-2 text-left w-1/3">
                    Total: {total ? total : <span>null</span>}
                </td>
                <td className="px-4 py-2 text-center w-1/3">
                    {totalPage ? (
                        Array.from({ length: totalPage }, (_, i) => (
                            <span
                                key={i}
                                onClick={() => alert(`click +${i + 1}`)}
                                className="mx-1 px-2 py-1 border rounded cursor-pointer hover:bg-gray-200"
                            >
                                {i + 1}
                            </span>
                        ))
                    ) : <span>null</span>}
                </td>
                <td className="px-4 py-2 text-center w-1/3">
                    Página actual: {Page ? Page : <span>null</span>}
                </td>
            </tr>
        </tfoot>

    )
}
export const EmptyTd = () => {
    return (
        <tr>

            <td>NO DATA</td>
        </tr>
    )
}
export const InputSearch = ({ onChange }) => {
    return (
        <input type="text" className="rounded-4xl border p-2 focus:w-2xs" onChange={onChange} />
    )
}