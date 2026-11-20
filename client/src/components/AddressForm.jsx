import { INDIAN_STATES } from '../utils/constants';

export const EMPTY_ADDRESS = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

// Same rules as the server, so most mistakes are caught before submitting.
export function validateAddress(a) {
  const e = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the full name';
  if (!/^[6-9]\d{9}$/.test(a.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
  if (!/^\d{6}$/.test(a.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode';
  if (a.line1.trim().length < 3) e.line1 = 'Enter house no. / building / street';
  if (a.city.trim().length < 2) e.city = 'Enter the city';
  if (!a.state) e.state = 'Select the state';
  return e;
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Controlled address fields. Parent owns `value` and `errors`.
export default function AddressForm({ value, onChange, errors = {}, idPrefix = 'addr' }) {
  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === 'phone' || k === 'pincode') v = v.replace(/\D/g, '');
    onChange({ ...value, [k]: v });
  };
  const props = (k) => ({
    id: `${idPrefix}-${k}`,
    value: value[k],
    onChange: set(k),
    'aria-invalid': !!errors[k],
    'aria-describedby': errors[k] ? `${idPrefix}-${k}-err` : undefined,
    className: `input ${errors[k] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`,
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${idPrefix}-fullName`} label="Full name" error={errors.fullName}>
        <input {...props('fullName')} autoComplete="name" maxLength={80} />
      </Field>
      <Field id={`${idPrefix}-phone`} label="Mobile number" error={errors.phone}>
        <input {...props('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit number" />
      </Field>
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-line1`} label="House no., building, street" error={errors.line1}>
          <input {...props('line1')} autoComplete="address-line1" maxLength={200} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-line2`} label="Area, landmark (optional)" error={errors.line2}>
          <input {...props('line2')} autoComplete="address-line2" maxLength={200} />
        </Field>
      </div>
      <Field id={`${idPrefix}-pincode`} label="Pincode" error={errors.pincode}>
        <input {...props('pincode')} inputMode="numeric" autoComplete="postal-code" maxLength={6} />
      </Field>
      <Field id={`${idPrefix}-city`} label="City" error={errors.city}>
        <input {...props('city')} autoComplete="address-level2" maxLength={60} />
      </Field>
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-state`} label="State" error={errors.state}>
          <select {...props('state')} autoComplete="address-level1">
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
