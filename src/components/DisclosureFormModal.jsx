import { useState } from 'react';
import './DisclosureFormModal.css';

const DisclosureFormModal = ({ 
  isOpen, 
  onClose, 
  disclosureType, 
  initialData = null,
  onSave 
}) => {
  const [formData, setFormData] = useState(initialData || getDefaultFormData(disclosureType));
  const [certified, setCertified] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate required fields based on disclosure type
    const requiredFields = getRequiredFields(disclosureType, formData);
    requiredFields.forEach(field => {
      if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
        newErrors[field] = 'This field is required';
      }
    });

    if (!certified) {
      newErrors.certified = 'You must certify that the information is correct';
    }

    if (!signatureName.trim()) {
      newErrors.signatureName = 'Signature name is required';
    }

    if (!signatureDate) {
      newErrors.signatureDate = 'Signature date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submissionData = {
      ...formData,
      certified: true,
      signatureName: signatureName.trim(),
      signatureDate,
      completedAt: new Date().toISOString(),
    };

    onSave(submissionData);
    onClose();
  };

  const renderFormFields = () => {
    switch (disclosureType) {
      case 'propertyCondition':
        return (
          <>
            <div className="form-group">
              <label>Property Age *</label>
              <input
                type="text"
                value={formData.propertyAge || ''}
                onChange={(e) => handleInputChange('propertyAge', e.target.value)}
                placeholder="e.g., Built in 1995"
              />
              {errors.propertyAge && <span className="error">{errors.propertyAge}</span>}
            </div>

            <div className="form-group">
              <label>Overall Property Condition *</label>
              <select
                value={formData.overallCondition || ''}
                onChange={(e) => handleInputChange('overallCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
              {errors.overallCondition && <span className="error">{errors.overallCondition}</span>}
            </div>

            <div className="form-group">
              <label>Roof Condition</label>
              <select
                value={formData.roofCondition || ''}
                onChange={(e) => handleInputChange('roofCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_replacement">Needs Replacement</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>HVAC System Condition</label>
              <select
                value={formData.hvacCondition || ''}
                onChange={(e) => handleInputChange('hvacCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_replacement">Needs Replacement</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>Plumbing System Condition</label>
              <select
                value={formData.plumbingCondition || ''}
                onChange={(e) => handleInputChange('plumbingCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>Electrical System Condition</label>
              <select
                value={formData.electricalCondition || ''}
                onChange={(e) => handleInputChange('electricalCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_upgrade">Needs Upgrade</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>Foundation Condition</label>
              <select
                value={formData.foundationCondition || ''}
                onChange={(e) => handleInputChange('foundationCondition', e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="has_issues">Has Issues</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                value={formData.additionalNotes || ''}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                rows={4}
                placeholder="Any additional information about the property condition..."
              />
            </div>
          </>
        );

      case 'leadPaint':
        return (
          <>
            <div className="form-group">
              <label>Year Property Built *</label>
              <input
                type="number"
                value={formData.yearBuilt || ''}
                onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                placeholder="e.g., 1975"
                min="1800"
                max="1978"
              />
              {errors.yearBuilt && <span className="error">{errors.yearBuilt}</span>}
              <small>Required for properties built before 1978</small>
            </div>

            <div className="form-group">
              <label>Presence of Lead-Based Paint *</label>
              <select
                value={formData.hasLeadPaint || ''}
                onChange={(e) => handleInputChange('hasLeadPaint', e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes - Lead-based paint is present</option>
                <option value="no">No - No lead-based paint present</option>
                <option value="unknown">Unknown - Not tested</option>
              </select>
              {errors.hasLeadPaint && <span className="error">{errors.hasLeadPaint}</span>}
            </div>

            {formData.hasLeadPaint === 'yes' && (
              <>
                <div className="form-group">
                  <label>Location of Lead-Based Paint</label>
                  <textarea
                    value={formData.leadPaintLocation || ''}
                    onChange={(e) => handleInputChange('leadPaintLocation', e.target.value)}
                    rows={3}
                    placeholder="Describe where lead-based paint is located in the property..."
                  />
                </div>

                <div className="form-group">
                  <label>Lead Paint Testing Date</label>
                  <input
                    type="date"
                    value={formData.testingDate || ''}
                    onChange={(e) => handleInputChange('testingDate', e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Additional Information</label>
              <textarea
                value={formData.additionalInfo || ''}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                rows={3}
                placeholder="Any additional information about lead-based paint..."
              />
            </div>
          </>
        );

      case 'hoaDisclosures':
        return (
          <>
            <div className="form-group">
              <label>HOA Name *</label>
              <input
                type="text"
                value={formData.hoaName || ''}
                onChange={(e) => handleInputChange('hoaName', e.target.value)}
                placeholder="Name of Homeowners Association"
              />
              {errors.hoaName && <span className="error">{errors.hoaName}</span>}
            </div>

            <div className="form-group">
              <label>Monthly HOA Dues *</label>
              <input
                type="number"
                value={formData.monthlyDues || ''}
                onChange={(e) => handleInputChange('monthlyDues', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.monthlyDues && <span className="error">{errors.monthlyDues}</span>}
            </div>

            <div className="form-group">
              <label>HOA Contact Information</label>
              <input
                type="text"
                value={formData.hoaContact || ''}
                onChange={(e) => handleInputChange('hoaContact', e.target.value)}
                placeholder="Phone number or email"
              />
            </div>

            <div className="form-group">
              <label>Special Assessments</label>
              <textarea
                value={formData.specialAssessments || ''}
                onChange={(e) => handleInputChange('specialAssessments', e.target.value)}
                rows={3}
                placeholder="Any pending or recent special assessments..."
              />
            </div>

            <div className="form-group">
              <label>HOA Rules & Restrictions</label>
              <textarea
                value={formData.rulesRestrictions || ''}
                onChange={(e) => handleInputChange('rulesRestrictions', e.target.value)}
                rows={4}
                placeholder="Notable rules, restrictions, or covenants..."
              />
            </div>

            <div className="form-group">
              <label>HOA Amenities</label>
              <textarea
                value={formData.amenities || ''}
                onChange={(e) => handleInputChange('amenities', e.target.value)}
                rows={3}
                placeholder="Community amenities (pool, gym, clubhouse, etc.)..."
              />
            </div>
          </>
        );

      case 'floodZone':
        return (
          <>
            <div className="form-group">
              <label>Flood Zone Designation *</label>
              <select
                value={formData.floodZone || ''}
                onChange={(e) => handleInputChange('floodZone', e.target.value)}
              >
                <option value="">Select flood zone</option>
                <option value="X">Zone X - Minimal flood risk</option>
                <option value="A">Zone A - High flood risk</option>
                <option value="AE">Zone AE - High flood risk (with base flood elevation)</option>
                <option value="AH">Zone AH - High flood risk (shallow flooding)</option>
                <option value="AO">Zone AO - High flood risk (sheet flow)</option>
                <option value="V">Zone V - Coastal high hazard area</option>
                <option value="VE">Zone VE - Coastal high hazard area (with base flood elevation)</option>
                <option value="unknown">Unknown</option>
              </select>
              {errors.floodZone && <span className="error">{errors.floodZone}</span>}
            </div>

            <div className="form-group">
              <label>Flood Insurance Required</label>
              <select
                value={formData.floodInsuranceRequired || ''}
                onChange={(e) => handleInputChange('floodInsuranceRequired', e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label>Current Flood Insurance Premium (if applicable)</label>
              <input
                type="number"
                value={formData.floodInsurancePremium || ''}
                onChange={(e) => handleInputChange('floodInsurancePremium', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>History of Flooding</label>
              <textarea
                value={formData.floodHistory || ''}
                onChange={(e) => handleInputChange('floodHistory', e.target.value)}
                rows={3}
                placeholder="Any history of flooding on the property..."
              />
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                value={formData.additionalNotes || ''}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                rows={3}
                placeholder="Any additional information about flood zone..."
              />
            </div>
          </>
        );

      case 'knownDefects':
        return (
          <>
            <div className="form-group">
              <label>Known Defects or Problems *</label>
              <select
                value={formData.hasDefects || ''}
                onChange={(e) => handleInputChange('hasDefects', e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes - There are known defects</option>
                <option value="no">No - No known defects</option>
              </select>
              {errors.hasDefects && <span className="error">{errors.hasDefects}</span>}
            </div>

            {formData.hasDefects === 'yes' && (
              <>
                <div className="form-group">
                  <label>Description of Defects *</label>
                  <textarea
                    value={formData.defectsDescription || ''}
                    onChange={(e) => handleInputChange('defectsDescription', e.target.value)}
                    rows={6}
                    placeholder="Provide a detailed description of all known defects, problems, or issues with the property..."
                  />
                  {errors.defectsDescription && <span className="error">{errors.defectsDescription}</span>}
                </div>

                <div className="form-group">
                  <label>Location of Defects</label>
                  <textarea
                    value={formData.defectsLocation || ''}
                    onChange={(e) => handleInputChange('defectsLocation', e.target.value)}
                    rows={3}
                    placeholder="Where are these defects located in the property?"
                  />
                </div>

                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={formData.severity || ''}
                    onChange={(e) => handleInputChange('severity', e.target.value)}
                  >
                    <option value="">Select severity</option>
                    <option value="minor">Minor - Cosmetic or small issues</option>
                    <option value="moderate">Moderate - Requires repair but not urgent</option>
                    <option value="major">Major - Significant issues requiring immediate attention</option>
                    <option value="critical">Critical - Safety or structural concerns</option>
                  </select>
                </div>
              </>
            )}

            {formData.hasDefects === 'no' && (
              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={formData.additionalNotes || ''}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  rows={3}
                  placeholder="Any additional information..."
                />
              </div>
            )}
          </>
        );

      case 'priorRepairs':
        return (
          <>
            <div className="form-group">
              <label>Prior Repairs or Renovations</label>
              <select
                value={formData.hasRepairs || ''}
                onChange={(e) => handleInputChange('hasRepairs', e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes - Repairs or renovations have been made</option>
                <option value="no">No - No significant repairs or renovations</option>
              </select>
            </div>

            {formData.hasRepairs === 'yes' && (
              <>
                <div className="form-group">
                  <label>Description of Repairs/Renovations</label>
                  <textarea
                    value={formData.repairsDescription || ''}
                    onChange={(e) => handleInputChange('repairsDescription', e.target.value)}
                    rows={6}
                    placeholder="Describe all repairs, renovations, or improvements made to the property..."
                  />
                </div>

                <div className="form-group">
                  <label>Date of Repairs</label>
                  <input
                    type="text"
                    value={formData.repairsDate || ''}
                    onChange={(e) => handleInputChange('repairsDate', e.target.value)}
                    placeholder="e.g., 2020, or specific dates"
                  />
                </div>

                <div className="form-group">
                  <label>Work Performed By</label>
                  <input
                    type="text"
                    value={formData.workPerformedBy || ''}
                    onChange={(e) => handleInputChange('workPerformedBy', e.target.value)}
                    placeholder="Contractor name, DIY, etc."
                  />
                </div>

                <div className="form-group">
                  <label>Permits Obtained</label>
                  <select
                    value={formData.permitsObtained || ''}
                    onChange={(e) => handleInputChange('permitsObtained', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes - All required permits were obtained</option>
                    <option value="no">No - Permits were not obtained</option>
                    <option value="some">Some - Some permits were obtained</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </>
            )}
          </>
        );

      case 'insuranceClaims':
        return (
          <>
            <div className="form-group">
              <label>Insurance Claims History</label>
              <select
                value={formData.hasClaims || ''}
                onChange={(e) => handleInputChange('hasClaims', e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes - There have been insurance claims</option>
                <option value="no">No - No insurance claims</option>
              </select>
            </div>

            {formData.hasClaims === 'yes' && (
              <>
                <div className="form-group">
                  <label>Description of Claims</label>
                  <textarea
                    value={formData.claimsDescription || ''}
                    onChange={(e) => handleInputChange('claimsDescription', e.target.value)}
                    rows={6}
                    placeholder="Describe all insurance claims made on the property (water damage, fire, storm, etc.)..."
                  />
                </div>

                <div className="form-group">
                  <label>Date of Claims</label>
                  <input
                    type="text"
                    value={formData.claimsDate || ''}
                    onChange={(e) => handleInputChange('claimsDate', e.target.value)}
                    placeholder="e.g., 2019, 2021, or specific dates"
                  />
                </div>

                <div className="form-group">
                  <label>Claim Amount</label>
                  <input
                    type="number"
                    value={formData.claimAmount || ''}
                    onChange={(e) => handleInputChange('claimAmount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Type of Claim</label>
                  <select
                    value={formData.claimType || ''}
                    onChange={(e) => handleInputChange('claimType', e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="water">Water Damage</option>
                    <option value="fire">Fire</option>
                    <option value="storm">Storm/Wind</option>
                    <option value="theft">Theft/Vandalism</option>
                    <option value="liability">Liability</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const getDisclosureTitle = () => {
    const titles = {
      propertyCondition: 'Property Condition Disclosure',
      leadPaint: 'Lead-Based Paint Disclosure (Pre-1978)',
      hoaDisclosures: 'HOA Disclosures',
      floodZone: 'Flood Zone Disclosure',
      knownDefects: 'Known Defects Disclosure',
      priorRepairs: 'Prior Repairs Disclosure',
      insuranceClaims: 'Insurance Claims Disclosure',
    };
    return titles[disclosureType] || 'Disclosure Form';
  };

  return (
    <div className="disclosure-modal-overlay" onClick={onClose}>
      <div className="disclosure-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="disclosure-modal-header">
          <h2>{getDisclosureTitle()}</h2>
          <button type="button" className="disclosure-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="disclosure-form">
          <div className="disclosure-form-body">
            {renderFormFields()}

            <div className="disclosure-certification-section">
              <h3>Certification & Signature</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={certified}
                    onChange={(e) => {
                      setCertified(e.target.checked);
                      if (errors.certified) {
                        setErrors(prev => ({ ...prev, certified: null }));
                      }
                    }}
                  />
                  <strong>I certify that the information provided above is true and correct to the best of my knowledge. *</strong>
                </label>
                {errors.certified && <span className="error">{errors.certified}</span>}
              </div>

              <div className="form-group">
                <label>Signature Name *</label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => {
                    setSignatureName(e.target.value);
                    if (errors.signatureName) {
                      setErrors(prev => ({ ...prev, signatureName: null }));
                    }
                  }}
                  placeholder="Enter your full name"
                />
                {errors.signatureName && <span className="error">{errors.signatureName}</span>}
              </div>

              <div className="form-group">
                <label>Signature Date *</label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => {
                    setSignatureDate(e.target.value);
                    if (errors.signatureDate) {
                      setErrors(prev => ({ ...prev, signatureDate: null }));
                    }
                  }}
                />
                {errors.signatureDate && <span className="error">{errors.signatureDate}</span>}
              </div>
            </div>
          </div>

          <div className="disclosure-modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save & Complete</button>
          </div>
        </form>
      </div>
    </div>
  );
};

function getDefaultFormData(disclosureType) {
  const defaults = {
    propertyCondition: {},
    leadPaint: {},
    hoaDisclosures: {},
    floodZone: {},
    knownDefects: {},
    priorRepairs: {},
    insuranceClaims: {},
  };
  return defaults[disclosureType] || {};
}

function getRequiredFields(disclosureType, formData = {}) {
  const required = {
    propertyCondition: ['propertyAge', 'overallCondition'],
    leadPaint: ['yearBuilt', 'hasLeadPaint'],
    hoaDisclosures: ['hoaName', 'monthlyDues'],
    floodZone: ['floodZone'],
    knownDefects: ['hasDefects'],
    priorRepairs: [],
    insuranceClaims: [],
  };

  // Add conditional required fields
  if (disclosureType === 'knownDefects' && formData?.hasDefects === 'yes') {
    return ['hasDefects', 'defectsDescription'];
  }

  return required[disclosureType] || [];
}

export default DisclosureFormModal;
