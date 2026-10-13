import React, { useContext, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { AuthContext } from '../context/AuthContext';
import Icon from './Icon';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navRef = useRef(null);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: -12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power2.out', clearProps: 'all' }
      );
    }, navRef);
    return () => context.revert();
  }, []);

  return (
    <nav className="navbar" ref={navRef}>
      <a href="/" className="nav-brand" aria-label="LeetCode Reminder home">
        <span className="brand-mark"><Icon name="code" size={20} strokeWidth={2.2} /></span>
        <span className="brand-wordmark">LeetCode<span> Reminder</span></span>
      </a>

      {user && (
        <>
          <div className="nav-links" aria-label="Main navigation">
            <a href="#overview"><Icon name="grid" size={16} /> Overview</a>
            <a href="#questions"><Icon name="book" size={16} /> My questions</a>
          </div>
          <div className="nav-actions">
            <span className="nav-user">
              <span className="nav-avatar"><Icon name="user" size={16} /></span>
              <span>{user.username || user.email}</span>
            </span>
            <button type="button" onClick={logout} className="btn-nav-action" aria-label="Log out">
              Log out <Icon name="arrow" size={15} />
            </button>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
