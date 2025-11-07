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
        <Route path="gastos">
          <Route index element={<ExpensesList />} />
          <Route path="nuevo" element={<ExpenseForm />} />
          <Route path=":id/editar" element={<ExpenseEdit />} />
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
