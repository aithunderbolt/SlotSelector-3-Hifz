import { useState, useEffect } from 'react';
import { pb } from '../lib/supabaseClient';
import { useSlotAvailability } from '../hooks/useSlotAvailability';
import './RegistrationForm.css';

// Country codes with their phone number lengths
const COUNTRY_CODES = [
  { code: '+93', country: 'Afghanistan', abbr: 'AF', length: 9 },
  { code: '+355', country: 'Albania', abbr: 'AL', length: 9 },
  { code: '+213', country: 'Algeria', abbr: 'DZ', length: 9 },
  { code: '+376', country: 'Andorra', abbr: 'AD', length: 6 },
  { code: '+244', country: 'Angola', abbr: 'AO', length: 9 },
  { code: '+54', country: 'Argentina', abbr: 'AR', length: 10 },
  { code: '+374', country: 'Armenia', abbr: 'AM', length: 8 },
  { code: '+61', country: 'Australia', abbr: 'AU', length: 9 },
  { code: '+43', country: 'Austria', abbr: 'AT', length: 10 },
  { code: '+994', country: 'Azerbaijan', abbr: 'AZ', length: 9 },
  { code: '+973', country: 'Bahrain', abbr: 'BH', length: 8 },
  { code: '+880', country: 'Bangladesh', abbr: 'BD', length: 10 },
  { code: '+375', country: 'Belarus', abbr: 'BY', length: 9 },
  { code: '+32', country: 'Belgium', abbr: 'BE', length: 9 },
  { code: '+501', country: 'Belize', abbr: 'BZ', length: 7 },
  { code: '+229', country: 'Benin', abbr: 'BJ', length: 8 },
  { code: '+975', country: 'Bhutan', abbr: 'BT', length: 8 },
  { code: '+591', country: 'Bolivia', abbr: 'BO', length: 8 },
  { code: '+387', country: 'Bosnia', abbr: 'BA', length: 8 },
  { code: '+267', country: 'Botswana', abbr: 'BW', length: 8 },
  { code: '+55', country: 'Brazil', abbr: 'BR', length: 11 },
  { code: '+673', country: 'Brunei', abbr: 'BN', length: 7 },
  { code: '+359', country: 'Bulgaria', abbr: 'BG', length: 9 },
  { code: '+226', country: 'Burkina Faso', abbr: 'BF', length: 8 },
  { code: '+257', country: 'Burundi', abbr: 'BI', length: 8 },
  { code: '+855', country: 'Cambodia', abbr: 'KH', length: 9 },
  { code: '+237', country: 'Cameroon', abbr: 'CM', length: 9 },
  { code: '+1', country: 'Canada', abbr: 'CA', length: 10 },
  { code: '+238', country: 'Cape Verde', abbr: 'CV', length: 7 },
  { code: '+236', country: 'Central African Rep', abbr: 'CF', length: 8 },
  { code: '+235', country: 'Chad', abbr: 'TD', length: 8 },
  { code: '+56', country: 'Chile', abbr: 'CL', length: 9 },
  { code: '+86', country: 'China', abbr: 'CN', length: 11 },
  { code: '+57', country: 'Colombia', abbr: 'CO', length: 10 },
  { code: '+269', country: 'Comoros', abbr: 'KM', length: 7 },
  { code: '+242', country: 'Congo', abbr: 'CG', length: 9 },
  { code: '+243', country: 'Congo (DRC)', abbr: 'CD', length: 9 },
  { code: '+506', country: 'Costa Rica', abbr: 'CR', length: 8 },
  { code: '+385', country: 'Croatia', abbr: 'HR', length: 9 },
  { code: '+53', country: 'Cuba', abbr: 'CU', length: 8 },
  { code: '+357', country: 'Cyprus', abbr: 'CY', length: 8 },
  { code: '+420', country: 'Czech Republic', abbr: 'CZ', length: 9 },
  { code: '+45', country: 'Denmark', abbr: 'DK', length: 8 },
  { code: '+253', country: 'Djibouti', abbr: 'DJ', length: 8 },
  { code: '+593', country: 'Ecuador', abbr: 'EC', length: 9 },
  { code: '+20', country: 'Egypt', abbr: 'EG', length: 10 },
  { code: '+503', country: 'El Salvador', abbr: 'SV', length: 8 },
  { code: '+240', country: 'Equatorial Guinea', abbr: 'GQ', length: 9 },
  { code: '+291', country: 'Eritrea', abbr: 'ER', length: 7 },
  { code: '+372', country: 'Estonia', abbr: 'EE', length: 8 },
  { code: '+251', country: 'Ethiopia', abbr: 'ET', length: 9 },
  { code: '+679', country: 'Fiji', abbr: 'FJ', length: 7 },
  { code: '+358', country: 'Finland', abbr: 'FI', length: 10 },
  { code: '+33', country: 'France', abbr: 'FR', length: 9 },
  { code: '+241', country: 'Gabon', abbr: 'GA', length: 7 },
  { code: '+220', country: 'Gambia', abbr: 'GM', length: 7 },
  { code: '+995', country: 'Georgia', abbr: 'GE', length: 9 },
  { code: '+49', country: 'Germany', abbr: 'DE', length: 10 },
  { code: '+233', country: 'Ghana', abbr: 'GH', length: 9 },
  { code: '+30', country: 'Greece', abbr: 'GR', length: 10 },
  { code: '+502', country: 'Guatemala', abbr: 'GT', length: 8 },
  { code: '+224', country: 'Guinea', abbr: 'GN', length: 9 },
  { code: '+245', country: 'Guinea-Bissau', abbr: 'GW', length: 7 },
  { code: '+592', country: 'Guyana', abbr: 'GY', length: 7 },
  { code: '+509', country: 'Haiti', abbr: 'HT', length: 8 },
  { code: '+504', country: 'Honduras', abbr: 'HN', length: 8 },
  { code: '+852', country: 'Hong Kong', abbr: 'HK', length: 8 },
  { code: '+36', country: 'Hungary', abbr: 'HU', length: 9 },
  { code: '+354', country: 'Iceland', abbr: 'IS', length: 7 },
  { code: '+91', country: 'India', abbr: 'IN', length: 10 },
  { code: '+62', country: 'Indonesia', abbr: 'ID', length: 10 },
  { code: '+98', country: 'Iran', abbr: 'IR', length: 10 },
  { code: '+964', country: 'Iraq', abbr: 'IQ', length: 10 },
  { code: '+353', country: 'Ireland', abbr: 'IE', length: 9 },
  { code: '+972', country: 'Israel', abbr: 'IL', length: 9 },
  { code: '+39', country: 'Italy', abbr: 'IT', length: 10 },
  { code: '+225', country: 'Ivory Coast', abbr: 'CI', length: 8 },
  { code: '+81', country: 'Japan', abbr: 'JP', length: 10 },
  { code: '+962', country: 'Jordan', abbr: 'JO', length: 9 },
  { code: '+7', country: 'Kazakhstan', abbr: 'KZ', length: 10 },
  { code: '+254', country: 'Kenya', abbr: 'KE', length: 10 },
  { code: '+965', country: 'Kuwait', abbr: 'KW', length: 8 },
  { code: '+996', country: 'Kyrgyzstan', abbr: 'KG', length: 9 },
  { code: '+856', country: 'Laos', abbr: 'LA', length: 9 },
  { code: '+371', country: 'Latvia', abbr: 'LV', length: 8 },
  { code: '+961', country: 'Lebanon', abbr: 'LB', length: 8 },
  { code: '+266', country: 'Lesotho', abbr: 'LS', length: 8 },
  { code: '+231', country: 'Liberia', abbr: 'LR', length: 7 },
  { code: '+218', country: 'Libya', abbr: 'LY', length: 10 },
  { code: '+370', country: 'Lithuania', abbr: 'LT', length: 8 },
  { code: '+352', country: 'Luxembourg', abbr: 'LU', length: 9 },
  { code: '+853', country: 'Macau', abbr: 'MO', length: 8 },
  { code: '+389', country: 'Macedonia', abbr: 'MK', length: 8 },
  { code: '+261', country: 'Madagascar', abbr: 'MG', length: 9 },
  { code: '+265', country: 'Malawi', abbr: 'MW', length: 9 },
  { code: '+60', country: 'Malaysia', abbr: 'MY', length: 9 },
  { code: '+960', country: 'Maldives', abbr: 'MV', length: 7 },
  { code: '+223', country: 'Mali', abbr: 'ML', length: 8 },
  { code: '+356', country: 'Malta', abbr: 'MT', length: 8 },
  { code: '+222', country: 'Mauritania', abbr: 'MR', length: 8 },
  { code: '+230', country: 'Mauritius', abbr: 'MU', length: 8 },
  { code: '+52', country: 'Mexico', abbr: 'MX', length: 10 },
  { code: '+373', country: 'Moldova', abbr: 'MD', length: 8 },
  { code: '+377', country: 'Monaco', abbr: 'MC', length: 8 },
  { code: '+976', country: 'Mongolia', abbr: 'MN', length: 8 },
  { code: '+382', country: 'Montenegro', abbr: 'ME', length: 8 },
  { code: '+212', country: 'Morocco', abbr: 'MA', length: 9 },
  { code: '+258', country: 'Mozambique', abbr: 'MZ', length: 9 },
  { code: '+95', country: 'Myanmar', abbr: 'MM', length: 9 },
  { code: '+264', country: 'Namibia', abbr: 'NA', length: 9 },
  { code: '+977', country: 'Nepal', abbr: 'NP', length: 10 },
  { code: '+31', country: 'Netherlands', abbr: 'NL', length: 9 },
  { code: '+64', country: 'New Zealand', abbr: 'NZ', length: 9 },
  { code: '+505', country: 'Nicaragua', abbr: 'NI', length: 8 },
  { code: '+227', country: 'Niger', abbr: 'NE', length: 8 },
  { code: '+234', country: 'Nigeria', abbr: 'NG', length: 10 },
  { code: '+850', country: 'North Korea', abbr: 'KP', length: 10 },
  { code: '+47', country: 'Norway', abbr: 'NO', length: 8 },
  { code: '+968', country: 'Oman', abbr: 'OM', length: 8 },
  { code: '+92', country: 'Pakistan', abbr: 'PK', length: 10 },
  { code: '+970', country: 'Palestine', abbr: 'PS', length: 9 },
  { code: '+507', country: 'Panama', abbr: 'PA', length: 8 },
  { code: '+675', country: 'Papua New Guinea', abbr: 'PG', length: 8 },
  { code: '+595', country: 'Paraguay', abbr: 'PY', length: 9 },
  { code: '+51', country: 'Peru', abbr: 'PE', length: 9 },
  { code: '+63', country: 'Philippines', abbr: 'PH', length: 10 },
  { code: '+48', country: 'Poland', abbr: 'PL', length: 9 },
  { code: '+351', country: 'Portugal', abbr: 'PT', length: 9 },
  { code: '+974', country: 'Qatar', abbr: 'QA', length: 8 },
  { code: '+40', country: 'Romania', abbr: 'RO', length: 10 },
  { code: '+7', country: 'Russia', abbr: 'RU', length: 10 },
  { code: '+250', country: 'Rwanda', abbr: 'RW', length: 9 },
  { code: '+966', country: 'Saudi Arabia', abbr: 'SA', length: 9 },
  { code: '+221', country: 'Senegal', abbr: 'SN', length: 9 },
  { code: '+381', country: 'Serbia', abbr: 'RS', length: 9 },
  { code: '+248', country: 'Seychelles', abbr: 'SC', length: 7 },
  { code: '+232', country: 'Sierra Leone', abbr: 'SL', length: 8 },
  { code: '+65', country: 'Singapore', abbr: 'SG', length: 8 },
  { code: '+421', country: 'Slovakia', abbr: 'SK', length: 9 },
  { code: '+386', country: 'Slovenia', abbr: 'SI', length: 8 },
  { code: '+252', country: 'Somalia', abbr: 'SO', length: 8 },
  { code: '+27', country: 'South Africa', abbr: 'ZA', length: 9 },
  { code: '+82', country: 'South Korea', abbr: 'KR', length: 10 },
  { code: '+211', country: 'South Sudan', abbr: 'SS', length: 9 },
  { code: '+34', country: 'Spain', abbr: 'ES', length: 9 },
  { code: '+94', country: 'Sri Lanka', abbr: 'LK', length: 9 },
  { code: '+249', country: 'Sudan', abbr: 'SD', length: 9 },
  { code: '+597', country: 'Suriname', abbr: 'SR', length: 7 },
  { code: '+268', country: 'Swaziland', abbr: 'SZ', length: 8 },
  { code: '+46', country: 'Sweden', abbr: 'SE', length: 9 },
  { code: '+41', country: 'Switzerland', abbr: 'CH', length: 9 },
  { code: '+963', country: 'Syria', abbr: 'SY', length: 9 },
  { code: '+886', country: 'Taiwan', abbr: 'TW', length: 9 },
  { code: '+992', country: 'Tajikistan', abbr: 'TJ', length: 9 },
  { code: '+255', country: 'Tanzania', abbr: 'TZ', length: 9 },
  { code: '+66', country: 'Thailand', abbr: 'TH', length: 9 },
  { code: '+228', country: 'Togo', abbr: 'TG', length: 8 },
  { code: '+216', country: 'Tunisia', abbr: 'TN', length: 8 },
  { code: '+90', country: 'Turkey', abbr: 'TR', length: 10 },
  { code: '+993', country: 'Turkmenistan', abbr: 'TM', length: 8 },
  { code: '+256', country: 'Uganda', abbr: 'UG', length: 9 },
  { code: '+380', country: 'Ukraine', abbr: 'UA', length: 9 },
  { code: '+971', country: 'United Arab Emirates', abbr: 'AE', length: 9 },
  { code: '+44', country: 'United Kingdom', abbr: 'GB', length: 10 },
  { code: '+1', country: 'United States', abbr: 'US', length: 10 },
  { code: '+598', country: 'Uruguay', abbr: 'UY', length: 8 },
  { code: '+998', country: 'Uzbekistan', abbr: 'UZ', length: 9 },
  { code: '+678', country: 'Vanuatu', abbr: 'VU', length: 7 },
  { code: '+58', country: 'Venezuela', abbr: 'VE', length: 10 },
  { code: '+84', country: 'Vietnam', abbr: 'VN', length: 9 },
  { code: '+967', country: 'Yemen', abbr: 'YE', length: 9 },
  { code: '+260', country: 'Zambia', abbr: 'ZM', length: 9 },
  { code: '+263', country: 'Zimbabwe', abbr: 'ZW', length: 9 },
];

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp_mobile: '',
    slot_id: '',
    fathers_name: '',
    date_of_birth: '',
    tajweed_level: '',
    education: '',
    profession: '',
    previous_hifz: '',
  });
  const [countryCode, setCountryCode] = useState('+966'); // Default to Saudi Arabia
  const [mobileNumber, setMobileNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formTitle, setFormTitle] = useState('Hifz Registration Form');
  const { availableSlots, loading, error, refetch } = useSlotAvailability(formData.tajweed_level);

  useEffect(() => {
    const fetchFormTitle = async () => {
      try {
        const settings = await pb.collection('settings').getList(1, 1, {
          filter: 'key = "form_title"',
        });

        if (settings && settings.items.length > 0) {
          setFormTitle(settings.items[0].value);
        }
      } catch (err) {
        console.error('Error fetching form title:', err);
      }
    };

    fetchFormTitle();

    // Subscribe to settings changes
    pb.collection('settings').subscribe('*', (e) => {
      if (e.record.key === 'form_title') {
        setFormTitle(e.record.value);
      }
    });

    return () => {
      pb.collection('settings').unsubscribe();
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCountryCodeChange = (e) => {
    setCountryCode(e.target.value);
    // Update the full WhatsApp number
    if (mobileNumber) {
      setFormData({
        ...formData,
        whatsapp_mobile: e.target.value + mobileNumber,
      });
    }
  };

  const handleMobileNumberChange = (e) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    setMobileNumber(value);
    // Update the full WhatsApp number
    setFormData({
      ...formData,
      whatsapp_mobile: countryCode + value,
    });
  };

  const formatDateToDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  };

  const handleDobChange = (e) => {
    // Store in yyyy-mm-dd format (ISO format for database)
    setFormData({
      ...formData,
      date_of_birth: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Valid email is required';
    }
    
    // Validate mobile number based on selected country
    if (!mobileNumber) {
      return 'WhatsApp mobile number is required';
    }
    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);
    if (selectedCountry && mobileNumber.length !== selectedCountry.length) {
      return `Mobile number for ${selectedCountry.country} must be ${selectedCountry.length} digits`;
    }
    
    if (!formData.date_of_birth) {
      return 'Date of Birth is required';
    }
    if (!formData.tajweed_level) {
      return 'Please select your Tajweed level';
    }
    if (!formData.education.trim()) {
      return 'Education is required';
    }
    if (!formData.profession.trim()) {
      return 'Profession is required';
    }
    if (!formData.previous_hifz.trim()) {
      return 'Previous Hifz information is required';
    }
    if (!formData.slot_id) {
      return 'Please select a time slot';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus({ type: 'error', message: validationError });
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      // Check if WhatsApp number already exists - use getFirstListItem for better performance
      try {
        await pb.collection('registrations').getFirstListItem(
          `whatsapp_mobile = "${formData.whatsapp_mobile}"`
        );
        // If we get here, record exists
        setSubmitStatus({
          type: 'error',
          message: 'This WhatsApp number is already registered.',
        });
        setSubmitting(false);
        return;
      } catch (err) {
        // 404 means no existing record, which is what we want
        if (err.status !== 404) {
          throw err;
        }
      }

      await pb.collection('registrations').create({
        ...formData,
        registered_at: new Date().toISOString(),
      });

      const selectedSlot = availableSlots.find(slot => slot.id === formData.slot_id);
      setSubmitStatus({
        type: 'success',
        message: `Registration successful! You have been registered for ${selectedSlot?.display_name || 'the selected slot'}`,
      });
      setFormData({
        name: '',
        email: '',
        whatsapp_mobile: '',
        slot_id: '',
        fathers_name: '',
        date_of_birth: '',
        tajweed_level: '',
        education: '',
        profession: '',
        previous_hifz: '',
      });
      setMobileNumber('');
      setCountryCode('+966');
      refetch();
    } catch (err) {
      setSubmitStatus({
        type: 'error',
        message: err.message.includes('slot is full')
          ? 'This slot is now full. Please select another slot.'
          : err.message.includes('duplicate') || err.message.includes('unique')
            ? 'This WhatsApp number is already registered.'
            : 'Registration failed. Please try again.',
      });
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading available slots...</div>;
  }

  if (error) {
    return <div className="error">Error loading slots: {error}</div>;
  }

  if (availableSlots.length === 0) {
    return (
      <div className="container">
        <div className="form-card">
          <h1>{formTitle}</h1>
          <div className="error">All slots are currently full. Please check back later.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="form-card">
        <h1>{formTitle}</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fathers_name">Father's Name</label>
            <input
              type="text"
              id="fathers_name"
              name="fathers_name"
              value={formData.fathers_name}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="date_of_birth">Date of Birth *</label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleDobChange}
              required
              disabled={submitting}
            />
            {formData.date_of_birth && (
              <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                Selected: {formatDateToDisplay(formData.date_of_birth)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp_mobile">WhatsApp Mobile *</label>
            <div className="phone-input-container">
              <select
                className="country-code-select"
                value={countryCode}
                onChange={handleCountryCodeChange}
                disabled={submitting}
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.country} ({country.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                id="whatsapp_mobile"
                name="mobile_number"
                className="mobile-number-input"
                value={mobileNumber}
                onChange={handleMobileNumberChange}
                placeholder={`Enter ${COUNTRY_CODES.find(c => c.code === countryCode)?.length || ''} digits`}
                required
                disabled={submitting}
                maxLength={COUNTRY_CODES.find(c => c.code === countryCode)?.length || 15}
              />
            </div>
            {mobileNumber && (
              <small className="phone-preview">
                Full number: {countryCode}{mobileNumber}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Level of Tajweed *</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="tajweed_level"
                  value="Beginner"
                  checked={formData.tajweed_level === 'Beginner'}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
                <span className="radio-label">
                  Beginner <span style={{ color: '#666', fontSize: '0.9em' }}>- Half page a day</span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="tajweed_level"
                  value="Intermediate"
                  checked={formData.tajweed_level === 'Intermediate'}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
                <span className="radio-label">
                  Intermediate <span style={{ color: '#666', fontSize: '0.9em' }}>- Half page a day</span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="tajweed_level"
                  value="Advanced"
                  checked={formData.tajweed_level === 'Advanced'}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
                <span className="radio-label">
                  Advanced <span style={{ color: '#666', fontSize: '0.9em' }}>- Half page a day or One page a day</span>
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="education">Education *</label>
            <input
              type="text"
              id="education"
              name="education"
              value={formData.education}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="profession">Profession *</label>
            <input
              type="text"
              id="profession"
              name="profession"
              value={formData.profession}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="previous_hifz">Previous Hifz, if any *</label>
            <textarea
              id="previous_hifz"
              name="previous_hifz"
              value={formData.previous_hifz}
              onChange={handleChange}
              required
              disabled={submitting}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Time Slot (KSA Time) *</label>
            <div className="radio-group">
              {availableSlots.map((slot) => (
                <label key={slot.id} className="radio-option">
                  <input
                    type="radio"
                    name="slot_id"
                    value={slot.id}
                    checked={formData.slot_id === slot.id}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                  <span className="radio-label">{slot.display_name}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="submit-btn">
            {submitting ? 'Submitting...' : 'Register'}
          </button>
        </form>

        {submitStatus && (
          <div className={`status-message ${submitStatus.type}`}>
            {submitStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationForm;
