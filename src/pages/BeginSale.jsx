import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BeginSale.css';

const BeginSale = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/begin-sale');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleContinue = () => {
    navigate('/list-property', { state: { startFresh: true } });
  };

  if (authLoading) {
    return (
      <div className="begin-sale-page">
        <div className="begin-sale-container">
          <div className="begin-sale-loading">Loading...</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="begin-sale-page">
      <div className="begin-sale-container">
        <h1>Begin your home sale</h1>
        <p className="begin-sale-disclaimer">
          This is just an initial workflow to create a verified listing. Additional workflow steps will be taken later on.
        </p>
        <p className="begin-sale-cta-copy">
          When you're ready, continue to create your listing with your address, property details, pricing, and photos.
        </p>
        <button type="button" className="btn btn-primary btn-large" onClick={handleContinue}>
          Continue to List Property
        </button>
      </div>
    </div>
  );
};

export default BeginSale;
