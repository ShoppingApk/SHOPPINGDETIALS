import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ChatGate from './components/ChatGate';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Home loads with the main bundle; every other page is split into its own chunk.
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Categories = lazy(() => import('./pages/Categories'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="categories" element={<Categories />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Guests are sent to /login and brought back afterwards */}
          <Route element={<ProtectedRoute />}>
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success/:id" element={<OrderSuccess />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Admin only; other roles see the normal 404 page */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Full-screen route outside the shop layout. Shows the normal 404 page unless unlocked. */}
        <Route path="c" element={<ChatGate />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: { borderRadius: '10px', fontSize: '14px' },
          success: { iconTheme: { primary: '#c81e6a', secondary: '#fff' } },
        }}
        containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      />
    </>
  );
}
