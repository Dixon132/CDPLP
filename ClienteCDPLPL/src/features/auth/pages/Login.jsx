import { LoginForm } from "../components/LoginForm";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import sendLogin from "../services/sendLogin";

export default function Login() {
    const navigate = useNavigate();
    const hook = useLogin((data) => sendLogin(data, navigate));
    return <LoginForm hook={hook} onSubmit={hook.onSubmit} />;
}
