import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Lazy loading de páginas — cada ruta carga su código solo cuando se visita
const Login          = lazy(() => import('./pages/Auth/Login'));
const InitialSetup   = lazy(() => import('./pages/Auth/InitialSetup'));
const Dashboard      = lazy(() => import('./pages/Dashboard/Dashboard'));
const Sessions       = lazy(() => import('./pages/Sessions/Sessions'));
const Settings       = lazy(() => import('./pages/Settings/Settings'));
const Home           = lazy(() => import('./pages/Home/Home'));
const DutiesPlanner  = lazy(() => import('./pages/Duties/DutiesPlanner'));
const VacationManager     = lazy(() => import('./pages/Vacations/VacationManager'));
const MonthlyLiquidations = lazy(() => import('./pages/Liquidations/MonthlyLiquidations'));

// Pantalla de carga mientras se descarga el chunk de la página
const PageLoader: React.FC = () => (
  <div className="page-loader-fade flex items-center justify-center h-full w-full min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-teal-600/30 border-t-teal-600 animate-spin" />
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
        Cargando…
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<InitialSetup />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/home"      element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/duties"    element={<DutiesPlanner />} />
              <Route path="/sessions"  element={<Sessions />} />
              
              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/settings"     element={<Settings />} />
                <Route path="/vacations"    element={<VacationManager />} />
                <Route path="/liquidations" element={<MonthlyLiquidations />} />
              </Route>
            </Route>
          </Route>
          
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

