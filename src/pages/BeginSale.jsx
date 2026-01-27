import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPreListingChecklist, isPreListingChecklistComplete } from '../services/preListingChecklistService';
import './BeginSale.css';

const BeginSale = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=/begin-sale');
      return;
    }
    checkChecklist();
  }, [authLoading, isAuthenticated, navigate, user?.uid]);

  const checkChecklist = async () => {
    if (!user?.uid) return;
    try {
      const checklist = await getPreListingChecklist(user.uid);
      if (isPreListingChecklistComplete(checklist)) {
        navigate('/list-property', { state: { startFresh: true }, replace: true });
      } else {
        navigate('/pre-listing-checklist', { replace: true });
      }
    } catch (err) {
      console.error('Error checking checklist:', err);
      navigate('/pre-listing-checklist', { replace: true });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="begin-sale-page">
      <div className="begin-sale-container">
        <div className="begin-sale-loading">
          {authLoading || checking ? 'Loading...' : 'Redirecting...'}
        </div>
      </div>
    </div>
  );
};

export default BeginSale;
