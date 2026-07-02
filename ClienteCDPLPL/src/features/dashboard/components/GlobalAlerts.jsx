import { useCallback, useEffect, useState } from "react";
import Alerts from "./Alerts";

const inferType = (message) => {
    const text = String(message || "").toLowerCase();
    if (text.includes("error") || text.includes("fall") || text.includes("no se pudo")) return "error";
    if (text.includes("debes") || text.includes("seleccion") || text.includes("advert")) return "warning";
    return "success";
};

const inferDuration = (message) => {
    const text = String(message || "").toLowerCase();
    return text.includes("elimin") ? 4000 : 2000;
};

export default function GlobalAlerts() {
    const [alert, setAlert] = useState({ show: false, type: "success", message: "", duration: 2000 });

    const showAlert = useCallback((detail) => {
        const message = String(detail?.message ?? detail ?? "");
        setAlert({
            show: true,
            type: detail?.type || inferType(message),
            message,
            duration: detail?.duration || inferDuration(message),
        });
    }, []);

    useEffect(() => {
        const previousAlert = window.alert;

        window.alert = (message) => {
            showAlert(message);
        };

        const handleAppAlert = (event) => {
            showAlert(event.detail);
        };

        window.addEventListener("app-alert", handleAppAlert);

        return () => {
            window.alert = previousAlert;
            window.removeEventListener("app-alert", handleAppAlert);
        };
    }, [showAlert]);

    return (
        <Alerts
            type={alert.type}
            message={alert.message}
            show={alert.show}
            duration={alert.duration}
            onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
        />
    );
}
