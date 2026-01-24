import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPurchaseProfile, setPurchaseProfile } from '../services/profileService';
import BuyerVerificationChecklist from '../components/BuyerVerificationChecklist';
import './VerifyBuyer.css';

const VerifyBuyer = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const [loading, setLoading] = useState(true);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const returnTo = redirect ? `/verify-buyer?redirect=${encodeURIComponent(redirect)}` : '/verify-buyer';
      navigate(`/sign-in?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }
    loadProfile();
  }, [isAuthenticated, authLoading, redirect, navigate]);

  const loadProfile = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const profile = await getPurchaseProfile(user.uid);
      setAlreadyVerified(!!(profile?.buyerVerified && profile?.buyerInfo));
    } catch (err) {
      console.error(err);
      setAlreadyVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (verificationData) => {
    if (!user?.uid) return;
    try {
      await setPurchaseProfile(user.uid, {
        buyerVerified: true,
        buyerVerifiedAt: new Date(),
        verificationDocuments: {
          proofOfFunds: verificationData.proofOfFunds,
          preApprovalLetter: verificationData.preApprovalLetter,
          bankLetter: verificationData.bankLetter,
          governmentId: verificationData.governmentId,
        },
        buyerInfo: verificationData.buyerInfo,
      });
      navigate(redirect || '/dashboard', { state: { verified: true } });
    } catch (err) {
      console.error('Failed to save verification:', err);
      alert('Failed to save. Please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="verify-buyer-page">
        <div className="verify-buyer-container">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (alreadyVerified) {
    return (
      <div className="verify-buyer-page">
        <div className="verify-buyer-container verify-buyer-success">
          <h1>You're a verified buyer</h1>
          <p>You can submit offers on any property. Sellers will see your verified status.</p>
          <div className="verify-buyer-actions">
            {redirect ? (
              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={() => navigate(redirect)}
              >
                Continue to submit offer
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary btn-large"
              onClick={() => navigate('/browse')}
            >
              Browse properties
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-buyer-page">
      <div className="verify-buyer-container">
        <BuyerVerificationChecklist
          onComplete={handleComplete}
          continueLabel="Complete verification"
        />
      </div>
    </div>
  );
};

export default VerifyBuyer;
