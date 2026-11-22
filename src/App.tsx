import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast.tsx';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { DashboardLayout } from './layouts/DashboardLayout.tsx';
import { AllowancesPage } from './pages/AllowancesPage.tsx';
import { AttendancePage } from './pages/AttendancePage.tsx';
import { AttendanceReportPage } from './pages/AttendanceReportPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DeductionsPage } from './pages/DeductionsPage.tsx';
import { DepartmentsPage } from './pages/DepartmentsPage.tsx';
import { DepartmentSalaryReportPage } from './pages/DepartmentSalaryReportPage.tsx';
import { DesignationsPage } from './pages/DesignationsPage.tsx';
import { EmployeesPage } from './pages/EmployeesPage.tsx';
import { EmployeeSalaryReportPage } from './pages/EmployeeSalaryReportPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MonthlyPayrollReportPage } from './pages/MonthlyPayrollReportPage.tsx';
import { PayrollGeneratePage } from './pages/PayrollGeneratePage.tsx';
import { PayrollPage } from './pages/PayrollPage.tsx';
import { ReportsHubPage } from './pages/ReportsHubPage.tsx';
import { SalaryStructuresPage } from './pages/SalaryStructuresPage.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicLoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicLoginRoute />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/designations"
              element={
                <ProtectedRoute>
                  <DesignationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salary-structures"
              element={
                <ProtectedRoute>
                  <SalaryStructuresPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/allowances"
              element={
                <ProtectedRoute>
                  <AllowancesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deductions"
              element={
                <ProtectedRoute>
                  <DeductionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <PayrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll/generate"
              element={
                <ProtectedRoute>
                  <PayrollGeneratePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/department-salary"
              element={
                <ProtectedRoute>
                  <DepartmentSalaryReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/employee-salary"
              element={
                <ProtectedRoute>
                  <EmployeeSalaryReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/attendance"
              element={
                <ProtectedRoute>
                  <AttendanceReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/monthly-payroll"
              element={
                <ProtectedRoute>
                  <MonthlyPayrollReportPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
