import React, { useContext, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { AuthContext } from '../context/AuthContext';
import Icon from '../components/Icon';

const Auth = () => {
  const { login, register } = useContext(AuthContext);
  const panelRef = useRef(null);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'all' }
      );
    }, panelRef);
    return () => context.revert();
  }, [isLogin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin((current) => !current);
    setError('');
  };

  return (
    <main className="auth-screen">
      <section className="auth-story">
        <div className="auth-story-glow" />
        <div className="auth-story-content">
          <span className="auth-kicker"><span className="eyebrow-dot" /> YOUR NEXT SOLUTION STARTS HERE</span>
          <h1>Get better<br />by <span>coming back.</span></h1>
          <p>Remember the patterns. Revisit the tricky ones. Build the kind of consistency that makes hard problems feel possible.</p>

          <div className="auth-steps">
            <div className="auth-step">
              <span className="auth-step-number">01</span>
              <span className="auth-step-icon"><Icon name="plus" size={18} /></span>
              <span><strong>Save the problem</strong><small>Capture what you are learning</small></span>
            </div>
            <div className="auth-step-line" />
            <div className="auth-step">
              <span className="auth-step-number">02</span>
              <span className="auth-step-icon"><Icon name="clock" size={18} /></span>
              <span><strong>Return at the right time</strong><small>Let spaced repetition do its thing</small></span>
            </div>
            <div className="auth-step-line" />
            <div className="auth-step">
              <span className="auth-step-number">03</span>
              <span className="auth-step-icon"><Icon name="target" size={18} /></span>
              <span><strong>Make it second nature</strong><small>One deliberate rep at a time</small></span>
            </div>
          </div>

          <div className="auth-story-note"><Icon name="sparkles" size={16} /> Consistency beats cramming. Every time.</div>
        </div>
        <span className="auth-story-footer">LEETCODE REMINDER <span>·</span> KEEP YOUR SKILLS IN MOTION</span>
      </section>

      <section className="auth-form-side">
        <div className="auth-card" ref={panelRef}>
          <div className="auth-mobile-brand">
            <span className="brand-mark"><Icon name="code" size={19} /></span>
            <span className="brand-wordmark">LeetCode<span> Reminder</span></span>
          </div>

          <div className="auth-form-heading">
            <span className="panel-overline">{isLogin ? 'WELCOME BACK' : 'START YOUR JOURNEY'}</span>
            <h2>{isLogin ? 'Good to see you.' : 'Let’s get started.'}</h2>
            <p>{isLogin ? 'Pick up where your practice left off.' : 'Create an account and build your review habit.'}</p>
          </div>

          {error && (
            <div className="inline-alert inline-alert-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-username">Username</label>
                <div className="input-with-icon">
                  <Icon name="user" size={17} />
                  <input
                    id="auth-username"
                    type="text"
                    className="form-input"
                    placeholder="Your name"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : isLogin ? 'Sign in to your workspace' : 'Create your account'}
              {!isSubmitting && <Icon name="arrow" size={17} />}
            </button>
          </form>

          <div className="auth-toggle">
            <span>{isLogin ? 'New here?' : 'Already have an account?'}</span>
            <button type="button" className="auth-toggle-link" onClick={toggleMode}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </div>
          <div className="auth-privacy"><Icon name="check" size={14} /> Your progress stays yours.</div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
