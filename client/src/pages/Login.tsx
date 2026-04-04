import { useState, useEffect, useRef, useLayoutEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<HTMLDivElement>(null);

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Mount animations
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.from(shieldRef.current, {
        scale: 0.5,
        opacity: 0,
        duration: 0.6,
        delay: 0.2,
        ease: 'back.out(1.4)',
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Invalid username or password.');
      } else {
        setError('Unable to connect to the server. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4">
      {/* Login card */}
      <div ref={containerRef} className="w-full max-w-md">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-primary-800 px-6 py-8 text-center text-white">
            <div ref={shieldRef} className="inline-block">
              <Shield className="mx-auto h-14 w-14 text-accent-400" />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-wide text-white">
              Federal Retirement Benefits Calculator
            </h1>
            <p className="mt-1 text-sm text-primary-200">U.S. Department of Commerce</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-8">
            {error && (
              <div className="alert-danger mb-6">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs leading-relaxed text-primary-200">
          WARNING: This is a U.S. Government computer system. Unauthorized access or use
          of this system may subject violators to criminal, civil, and/or administrative
          action. All information on this system may be monitored, recorded, and subject
          to audit.
        </p>
      </div>
    </div>
  );
}
