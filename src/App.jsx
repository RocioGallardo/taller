import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ClientsList from './pages/ClientsList.jsx'
import ClientForm from './pages/ClientForm.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import ClientEdit from './pages/ClientEdit.jsx'
import BudgetsList from './pages/BudgetsList.jsx'
import BudgetForm from './pages/BudgetForm.jsx'
import BudgetDetail from './pages/BudgetDetail.jsx'
import BudgetEdit from './pages/BudgetEdit.jsx'
import ExpensesList from './pages/ExpensesList.jsx'
import ExpenseForm from './pages/ExpenseForm.jsx'
import ExpenseEdit from './pages/ExpenseEdit.jsx'
import OrdersList from './pages/OrdersList.jsx'
import OrderForm from './pages/OrderForm.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import OrderEdit from './pages/OrderEdit.jsx'
import IncomesList from './pages/IncomesList.jsx'
import IncomeForm from './pages/IncomeForm.jsx'
import IncomeEdit from './pages/IncomeEdit.jsx'
import ReportsLayout from './pages/ReportsLayout.jsx'
import ReportsDebts from './pages/ReportsDebts.jsx'
import ReportsOrders from './pages/ReportsOrders.jsx'
import ReportsFinancial from './pages/ReportsFinancial.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clientes">
          <Route index element={<ClientsList />} />
          <Route path="nuevo" element={<ClientForm />} />
          <Route path=":id" element={<ClientDetail />} />
          <Route path=":id/editar" element={<ClientEdit />} />
        </Route>
        <Route path="presupuestos">
          <Route index element={<BudgetsList />} />
          <Route path="nuevo" element={<BudgetForm />} />
          <Route path=":id" element={<BudgetDetail />} />
          <Route path=":id/editar" element={<BudgetEdit />} />
        </Route>
        <Route path="egresos">
          <Route index element={<ExpensesList />} />
          <Route path="gastos">
            <Route index element={<ExpensesList />} />
            <Route path="nuevo" element={<ExpenseForm />} />
            <Route path=":id/editar" element={<ExpenseEdit />} />
          </Route>
        </Route>
        <Route path="ingresos">
          <Route index element={<IncomesList />} />
          <Route path="nuevo" element={<IncomeForm />} />
          <Route path=":id/editar" element={<IncomeEdit />} />
        </Route>
        <Route path="ordenes">
          <Route index element={<OrdersList />} />
          <Route path="nueva" element={<OrderForm />} />
          <Route path=":id" element={<OrderDetail />} />
          <Route path=":id/editar" element={<OrderEdit />} />
        </Route>
        <Route path="reportes" element={<ReportsLayout />}>
          <Route index element={<ReportsDebts />} />
          <Route path="deudas" element={<ReportsDebts />} />
          <Route path="ordenes" element={<ReportsOrders />} />
          <Route path="finanzas" element={<ReportsFinancial />} />
        </Route>
        <Route
          path="*"
          element={
            <main style={{ padding: '2rem' }}>
              <h2>Página no encontrada</h2>
              <p>Revisá la URL o volvé al inicio.</p>
            </main>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
