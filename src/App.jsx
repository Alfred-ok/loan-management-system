import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Membership/Members";
import Loaning from "./pages/Loaning";
import LoanApplication from "./pages/Loaning/LoanApplication";
import LoanRegister from "./pages/Loaning/LoanRegister";
import Repayments from "./pages/Loaning/Repayments";
import LoanCalculator from "./pages/Loaning/LoanCalculator";
import LoanProducts from "./pages/Loaning/LoanProducts";
import LoanSector from "./pages/Loaning/LoanSector";
import LoanSubSector from "./pages/Loaning/LoanSubSector";

function RequireAuth({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route
                element={
                    <RequireAuth>
                        <Layout />
                    </RequireAuth>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="membership/members" element={<Members />} />
                <Route path="loaning" element={<Loaning />} />
                <Route path="loaning/applications" element={<LoanApplication />} />
                <Route path="loaning/register" element={<LoanRegister />} />
                <Route path="loaning/repayments" element={<Repayments />} />
                <Route path="loaning/calculator" element={<LoanCalculator />} />
                <Route path="loaning/products" element={<LoanProducts />} />
                <Route path="loaning/sectors" element={<LoanSector />} />
                <Route path="loaning/sub-sectors" element={<LoanSubSector />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
