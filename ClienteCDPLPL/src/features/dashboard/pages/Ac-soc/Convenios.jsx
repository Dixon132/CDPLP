import { useEffect, useState } from "react";
import { getAllConvenios } from "../../services/convenios";
import {
    EmptyTd,
    H1,
    InputSearch,
    Tables,
    TBody,
    Td,
    Tfooter,
    THead
} from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button } from "../../components/Button";
import CreateConvenio from "./Components/CreateConvenio";
import ModificarConvenio from "./Components/ModificarConvenio";

const Convenios = () => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [convenios, setConvenios] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const fetchData = async () => {
        const { data, total, page: cur, totalPages } = await getAllConvenios({
            page,
            search,
        });
        setConvenios(data);
        setTotal(total);
        setTotalPage(totalPages);
        setPage(cur);
    };

    useEffect(() => {
        fetchData();
    }, [page, search]);

    return (
        <>
            <H1>Lista de Convenios</H1>
            <div className="flex items-center gap-4 mb-4">
                <Button className="bg-green-300" onClick={() => setShowCreate(true)}>Crear convenio</Button>
                <InputSearch
                    placeholder="Buscar por nombre o descripción…"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Tables>
                <THead
                    th={[
                        "Nombre",
                        "Descripción",
                        "Fecha inicio",
                        "Fecha fin",
                        "Estado",
                        
                    ]}
                />
                <TBody>
                    {!convenios.length ? (
                        <EmptyTd colSpan={6} />
                    ) : (
                        convenios.map((c) => (
                            <tr key={c.id_convenio}>
                                <Td>{c.nombre}</Td>
                                <Td>{c.descripcion}</Td>
                                <Td>
                                    {new Date(c.fecha_inicio).toLocaleDateString()}
                                </Td>
                                <Td>
                                    {c.fecha_fin
                                        ? new Date(c.fecha_fin).toLocaleDateString()
                                        : "—"}
                                </Td>
                                <Td>{c.estado}</Td>
                                <Td>
                                    <Button
                                        className="bg-amber-200"
                                        onClick={() => {
                                            setCurrentId(c.id_convenio);
                                            setShowEdit(true);
                                        }}
                                    >
                                        Modificar
                                    </Button>
                                </Td>
                            </tr>
                        ))
                    )}
                </TBody>
                <Tfooter
                    total={total}
                    totalPage={totalPage}
                    Page={page}
                    onPageChange={(p) => setPage(p)}
                />
            </Tables>

            {/* Modal Crear */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}>
                <CreateConvenio
                    onClose={() => {
                        setShowCreate(false);
                        fetchData();
                    }}
                />
            </Modal>

            {/* Modal Editar */}
            <Modal
                title="Modificar convenio"
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
            >
                <ModificarConvenio
                    id={currentId}
                    onClose={() => {
                        setShowEdit(false);
                        fetchData();
                    }}
                />
            </Modal>
        </>
    );
};

export default Convenios;
