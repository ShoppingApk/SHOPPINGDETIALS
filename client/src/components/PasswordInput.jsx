import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className="input pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
      </button>
    </div>
  );
}
