import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BeginSale.css';

const BeginSale = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=/begin-sale');
      return;
    }
    navigate('/list-property', { state: { startFresh: true }, replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  return (
    <div className="begin-sale-page">
      <div className="begin-sale-container">
        <div className="begin-sale-loading">
          {authLoading ? 'Loading...' : 'Redirecting...'}
        </div>
      </div>
    </div>
  );
};

export default BeginSale;
