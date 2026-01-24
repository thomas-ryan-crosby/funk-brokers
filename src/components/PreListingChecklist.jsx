import { useState } from 'react';
import { uploadFile } from '../services/storageService';
import './PreListingChecklist.css';

const PreListingChecklist = ({ onComplete }) => {
  const [checklist, setChecklist] = useState({
    deed: { completed: false, file: null, url: null },
    propertyTax: { completed: false, file: null, url: null },
    hoaDocuments: { completed: false, file: null, url: null },
    disclosureForms: { completed: false, file: null, url: null },
    inspectionReport: { completed: false, file: null, url: null },
  });

  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});

  const handleFileUpload = async (field, file, isMultiple = false) => {
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
      const filePath = `checklist/${timestamp}/${fileName}`;

      const url = await uploadFile(file, filePath);

      if (isMultiple) {
        setChecklist((prev) => ({
          ...prev,
          [field]: {
            completed: true,
            files: [...prev[field].files, file],
            urls: [...prev[field].urls, url],
          },
        }));
      } else {
        setChecklist((prev) => ({
          ...prev,
          [field]: {
            completed: true,
            file,
            url,
          },
        }));
      }
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
      checklist.deed.completed &&
      checklist.propertyTax.completed &&
      checklist.disclosureForms.completed
    );
  };

  const getCompletionPercentage = () => {
    const required = ['deed', 'propertyTax', 'disclosureForms'];
    const completed = required.filter((key) => checklist[key].completed);
    return Math.round((completed.length / required.length) * 100);
  };

  const handleContinue = () => {
    if (allRequiredComplete()) {
      const checklistData = {
        deed: checklist.deed.url,
        propertyTax: checklist.propertyTax.url,
        hoaDocuments: checklist.hoaDocuments.url,
        disclosureForms: checklist.disclosureForms.url,
        inspectionReport: checklist.inspectionReport.url,
        completedAt: new Date(),
      };
      onComplete(checklistData);
    }
  };

  return (
    <div className="pre-listing-checklist">
      <div className="checklist-header">
        <h2>Pre-Listing Checklist</h2>
        <p>Upload required documents. You’ll add property photos and listing details in the next step.</p>
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

      <div className="checklist-items">
        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.deed.completed}
                readOnly
              />
              <span>Property Deed *</span>
            </label>
            {checklist.deed.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload a copy of your property deed (PDF, JPG, or PNG)
          </p>
          {!checklist.deed.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('deed', e.target.files[0])}
                disabled={uploading.deed}
              />
              {uploading.deed && <span className="uploading">Uploading...</span>}
              {errors.deed && <span className="error">{errors.deed}</span>}
            </div>
          )}
          {checklist.deed.url && (
            <a href={checklist.deed.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.propertyTax.completed}
                readOnly
              />
              <span>Property Tax Records *</span>
            </label>
            {checklist.propertyTax.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload recent property tax records or statements
          </p>
          {!checklist.propertyTax.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('propertyTax', e.target.files[0])}
                disabled={uploading.propertyTax}
              />
              {uploading.propertyTax && <span className="uploading">Uploading...</span>}
              {errors.propertyTax && <span className="error">{errors.propertyTax}</span>}
            </div>
          )}
          {checklist.propertyTax.url && (
            <a href={checklist.propertyTax.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.hoaDocuments.completed}
                readOnly
              />
              <span>HOA Documents (if applicable)</span>
            </label>
            {checklist.hoaDocuments.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload HOA bylaws, rules, and financial statements if your property is in an HOA
          </p>
          {!checklist.hoaDocuments.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('hoaDocuments', e.target.files[0])}
                disabled={uploading.hoaDocuments}
              />
              {uploading.hoaDocuments && <span className="uploading">Uploading...</span>}
              {errors.hoaDocuments && <span className="error">{errors.hoaDocuments}</span>}
            </div>
          )}
          {checklist.hoaDocuments.url && (
            <a href={checklist.hoaDocuments.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.disclosureForms.completed}
                readOnly
              />
              <span>Property Disclosure Forms *</span>
            </label>
            {checklist.disclosureForms.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload completed property disclosure forms
          </p>
          {!checklist.disclosureForms.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('disclosureForms', e.target.files[0])}
                disabled={uploading.disclosureForms}
              />
              {uploading.disclosureForms && <span className="uploading">Uploading...</span>}
              {errors.disclosureForms && <span className="error">{errors.disclosureForms}</span>}
            </div>
          )}
          {checklist.disclosureForms.url && (
            <a href={checklist.disclosureForms.url} target="_blank" rel="noopener noreferrer" className="file-link">
              View Uploaded File
            </a>
          )}
        </div>

        <div className="checklist-item">
          <div className="item-header">
            <label>
              <input
                type="checkbox"
                checked={checklist.inspectionReport.completed}
                readOnly
              />
              <span>Property Inspection Report (optional)</span>
            </label>
            {checklist.inspectionReport.completed && (
              <span className="item-status completed">✓ Uploaded</span>
            )}
          </div>
          <p className="item-description">
            Upload a recent property inspection report (recommended but not required)
          </p>
          {!checklist.inspectionReport.completed && (
            <div className="item-upload">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('inspectionReport', e.target.files[0])}
                disabled={uploading.inspectionReport}
              />
              {uploading.inspectionReport && <span className="uploading">Uploading...</span>}
              {errors.inspectionReport && <span className="error">{errors.inspectionReport}</span>}
            </div>
          )}
          {checklist.inspectionReport.url && (
            <a href={checklist.inspectionReport.url} target="_blank" rel="noopener noreferrer" className="file-link">
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
          Continue to Property Listing
        </button>
        {!allRequiredComplete() && (
          <p className="completion-note">
            Please complete all required document uploads (*) to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default PreListingChecklist;
