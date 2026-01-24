import { useState } from 'react';
import { uploadFile } from '../services/storageService';
import './BuyerVerificationChecklist.css';

const BuyerVerificationChecklist = ({ onComplete, continueLabel = 'Continue to Submit Offer' }) => {
  const [checklist, setChecklist] = useState({
    proofOfFunds: { completed: false, file: null, url: null },
    preApprovalLetter: { completed: false, file: null, url: null },
    bankLetter: { completed: false, file: null, url: null },
    governmentId: { completed: false, file: null, url: null },
  });

  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleFileUpload = async (field, file) => {
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'File size must be less than 10MB',
      }));
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'File must be PDF, JPG, or PNG',
      }));
      return;
    }

    setUploading((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: null }));

    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${field}_${timestamp}.${fileExtension}`;
      const filePath = `buyer-verification/${timestamp}/${fileName}`;

      const url = await uploadFile(file, filePath);

      setChecklist((prev) => ({
        ...prev,
        [field]: {
          completed: true,
          file,
          url,
        },
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Failed to upload file. Please try again.',
      }));
      console.error('Upload error:', error);
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const allRequiredComplete = () => {
    return (
      checklist.proofOfFunds.completed &&
      (checklist.preApprovalLetter.completed || checklist.bankLetter.completed) &&
      checklist.governmentId.completed &&
      buyerInfo.name &&
      buyerInfo.email
    );
  };

  const getCompletionPercentage = () => {
    const required = ['proofOfFunds', 'governmentId'];
    const financing = checklist.preApprovalLetter.completed || checklist.bankLetter.completed;
    const info = buyerInfo.name && buyerInfo.email;
    
    const completed = required.filter((key) => checklist[key].completed).length;
    let total = required.length;
    if (financing) total++;
    if (info) total++;
    
    const completedCount = completed + (financing ? 1 : 0) + (info ? 1 : 0);
    return Math.round((completedCount / total) * 100);
  };

  const handleContinue = () => {
    if (allRequiredComplete()) {
      const verificationData = {
        proofOfFunds: checklist.proofOfFunds.url,
        preApprovalLetter: checklist.preApprovalLetter.url,
        bankLetter: checklist.bankLetter.url,
        governmentId: checklist.governmentId.url,
        buyerInfo,
        completedAt: new Date(),
      };
      onComplete(verificationData);
    }
  };

  return (
    <div className="buyer-verification-checklist">
      <div className="checklist-header">
        <h2>Buyer Verification Checklist</h2>
        <p>Complete the required items before submitting an offer</p>
        <div className="completion-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          <span>{getCompletionPercentage()}% Complete</span>
        </div>
      </div>

      <div className="buyer-info-section">
        <h3>Buyer Information</h3>
        <div className="info-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={buyerInfo.name}
              onChange={(e) => setBuyerInfo((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={buyerInfo.email}
              onChange={(e) => setBuyerInfo((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={buyerInfo.phone}
              onChange={(e) => setBuyerInfo((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="checklist-items">
        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.proofOfFunds.completed}
                readOnly
              />
              <span>Proof of Funds *</span>
            </label>
            {checklist.proofOfFunds.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload bank statements or investment account statements showing sufficient funds
          </p>
          {!checklist.proofOfFunds.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('proofOfFunds', e.target.files[0])}
                disabled={uploading.proofOfFunds}
              />
              {uploading.proofOfFunds && <span className="uploading">Uploading...</span>}
              {errors.proofOfFunds && <span className="error">{errors.proofOfFunds}</span>}
            </div>
          )}
          {checklist.proofOfFunds.url && (
            <a href={checklist.proofOfFunds.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.preApprovalLetter.completed || checklist.bankLetter.completed}
                readOnly
              />
              <span>Financing Documentation *</span>
            </label>
            {(checklist.preApprovalLetter.completed || checklist.bankLetter.completed) && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload either a pre-approval letter OR a bank letter confirming mortgage qualification
          </p>
          <div className="financing-options">
            <div className="financing-option">
              <label>Pre-Approval Letter</label>
              {!checklist.preApprovalLetter.completed && (
                <div className="item-upload">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload('preApprovalLetter', e.target.files[0])}
                    disabled={uploading.preApprovalLetter}
                  />
                  {uploading.preApprovalLetter && <span className="uploading">Uploading...</span>}
                  {errors.preApprovalLetter && <span className="error">{errors.preApprovalLetter}</span>}
                </div>
              )}
              {checklist.preApprovalLetter.url && (
                <a href={checklist.preApprovalLetter.url} target="_blank" rel="noopener noreferrer" className="file-link">
                  View Uploaded File
                </a>
              )}
            </div>
            <div className="financing-divider">OR</div>
            <div className="financing-option">
              <label>Bank Letter</label>
              {!checklist.bankLetter.completed && (
                <div className="item-upload">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload('bankLetter', e.target.files[0])}
                    disabled={uploading.bankLetter}
                  />
                  {uploading.bankLetter && <span className="uploading">Uploading...</span>}
                  {errors.bankLetter && <span className="error">{errors.bankLetter}</span>}
                </div>
              )}
              {checklist.bankLetter.url && (
                <a href={checklist.bankLetter.url} target="_blank" rel="noopener noreferrer" className="file-link">
                  View Uploaded File
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.governmentId.completed}
                readOnly
              />
              <span>Government-Issued ID *</span>
            </label>
            {checklist.governmentId.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload a copy of your driver's license, passport, or other government-issued ID
          </p>
          {!checklist.governmentId.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('governmentId', e.target.files[0])}
                disabled={uploading.governmentId}
              />
              {uploading.governmentId && <span className="uploading">Uploading...</span>}
              {errors.governmentId && <span className="error">{errors.governmentId}</span>}
            </div>
          )}
          {checklist.governmentId.url && (
            <a href={checklist.governmentId.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>
      </div>

      <div className="checklist-actions">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allRequiredComplete()}
          className="btn-primary btn-large"
        >
          {continueLabel}
        </button>
        {!allRequiredComplete() && (
          <p className="completion-note">
            Please complete all required items (*) to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default BuyerVerificationChecklist;
