import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

// Error Boundary to prevent crashes from breaking the entire app
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('STRATEGIA Connect Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: '#080c14', 
          color: '#fff', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😅</div>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
            Don't worry, your data is safe. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#e63946',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const StrategiaConnect = () => {
  // Initialize state from localStorage if available (prevents reset on refresh)
  const getStoredState = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(`strategia_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [view, setView] = useState(() => getStoredState('view', 'landing'));
  const [user, setUser] = useState(() => getStoredState('user', null));
  const [profiles, setProfiles] = useState([]);
  const [connections, setConnections] = useState(() => getStoredState('connections', []));
  const [sentRequests, setSentRequests] = useState(() => getStoredState('sentRequests', []));
  const [receivedRequests, setReceivedRequests] = useState(() => getStoredState('receivedRequests', []));
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [report, setReport] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => getStoredState('isAdmin', false));
  const [adminTab, setAdminTab] = useState('dashboard');
  const [feedbacks, setFeedbacks] = useState(() => getStoredState('feedbacks', []));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState(() => getStoredState('announcements', []));
  const [showQR, setShowQR] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [appTab, setAppTab] = useState('discover'); // App tab state at parent level
  const [networkError, setNetworkError] = useState(false);

  // Persist important state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('strategia_view', JSON.stringify(view));
    } catch (e) {}
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_user', JSON.stringify(user));
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_connections', JSON.stringify(connections));
    } catch (e) {}
  }, [connections]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_sentRequests', JSON.stringify(sentRequests));
    } catch (e) {}
  }, [sentRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_receivedRequests', JSON.stringify(receivedRequests));
    } catch (e) {}
  }, [receivedRequests]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_isAdmin', JSON.stringify(isAdmin));
    } catch (e) {}
  }, [isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_feedbacks', JSON.stringify(feedbacks));
    } catch (e) {}
  }, [feedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem('strategia_announcements', JSON.stringify(announcements));
    } catch (e) {}
  }, [announcements]);

  // Debounce search for performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const ADMIN = 'VanshuDogu';
  const avatarOptions = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓'];
  
  const allowlist = [
    { email: 'priya.sharma@iitm.ac.in', phone: '+919876543210', name: 'Priya Sharma' },
    { email: 'arjun.menon@bits-pilani.ac.in', phone: '+919876543211', name: 'Arjun Menon' },
    { email: 'sneha.patel@srcc.du.ac.in', phone: '+919876543212', name: 'Sneha Patel' },
    { email: 'rahul.k@iimb.ac.in', phone: '+919876543213', name: 'Rahul Krishnan' },
    { email: 'ananya.reddy@nitt.edu', phone: '+919876543214', name: 'Ananya Reddy' },
    { email: 'vikram.iyer@loyola.edu', phone: '+919876543215', name: 'Vikram Iyer' },
    { email: 'demo@test.com', phone: '+911234567890', name: 'Demo User' },
    { email: 'test@strategia.com', phone: '+919999999999', name: 'Test User' },
  ];

  const coreTeam = [
    { id: 'core1', name: 'Arun Kumar', email: 'arun@strategia.com', phone: '+919876500001', role: 'Event Head', college: 'Loyola College', year: 'Core Team', interests: ['Leadership', 'Strategy'], lookingFor: ['Networking'], bio: 'Leading STRATEGIA 26', avatar: '👨‍💼', linkedin: '', flagged: false, verified: true, isCore: true, connectionCount: 12 },
    { id: 'core2', name: 'Divya Menon', email: 'divya@strategia.com', phone: '+919876500002', role: 'Marketing Head', college: 'Loyola College', year: 'Core Team', interests: ['Marketing', 'Branding'], lookingFor: ['Networking'], bio: 'Spreading the STRATEGIA story', avatar: '👩‍💼', linkedin: '', flagged: false, verified: true, isCore: true, connectionCount: 8 },
    { id: 'core3', name: 'Karthik Rajan', email: 'karthik@strategia.com', phone: '+919876500003', role: 'Tech Lead', college: 'Loyola College', year: 'Core Team', interests: ['Tech', 'AI/ML', 'SaaS'], lookingFor: ['Networking'], bio: 'Building STRATEGIA digital', avatar: '👨‍💻', linkedin: '', flagged: false, verified: true, isCore: true, connectionCount: 15 },
    { id: 'core4', name: 'Meera Sharma', email: 'meera@strategia.com', phone: '+919876500004', role: 'Operations Head', college: 'Loyola College', year: 'Core Team', interests: ['Operations', 'Finance'], lookingFor: ['Networking'], bio: 'Making things run smooth', avatar: '👩‍🔧', linkedin: '', flagged: false, verified: true, isCore: true, connectionCount: 6 },
    { id: 'core5', name: 'Ravi Krishnan', email: 'ravi@strategia.com', phone: '+919876500005', role: 'Sponsorship Head', college: 'Loyola College', year: 'Core Team', interests: ['Business Dev', 'Finance', 'Consulting'], lookingFor: ['Networking'], bio: 'Connecting with partners', avatar: '🧑‍💼', linkedin: '', flagged: false, verified: true, isCore: true, connectionCount: 10 },
  ];
  const coreAllowlist = coreTeam.map(c => ({ email: c.email, phone: c.phone, name: c.name }));

  const sampleProfiles = [
    { id: '1', name: 'Priya Sharma', email: 'priya.sharma@iitm.ac.in', college: 'IIT Madras', year: '3rd Year', interests: ['Fintech', 'Marketing', 'Strategy'], lookingFor: ['Project Partners', 'Networking'], bio: 'Building fintech for rural India', avatar: '👩‍💼', phone: '+919876543210', linkedin: 'https://linkedin.com/in/priya', flagged: false, verified: true, connectionCount: 5 },
    { id: '2', name: 'Arjun Menon', email: 'arjun.menon@bits-pilani.ac.in', college: 'BITS Pilani', year: '4th Year', interests: ['AI/ML', 'EdTech', 'SaaS'], lookingFor: ['Startup Ideas', 'Study Buddies'], bio: 'Democratizing education with AI', avatar: '👨‍💻', phone: '+919876543211', linkedin: '', flagged: false, verified: true, connectionCount: 3 },
    { id: '3', name: 'Sneha Patel', email: 'sneha.patel@srcc.du.ac.in', college: 'SRCC Delhi', year: '2nd Year', interests: ['D2C', 'Branding', 'Marketing'], lookingFor: ['Friends', 'Networking'], bio: 'Building conscious brands', avatar: '👩‍🎨', phone: '+919876543212', linkedin: 'https://linkedin.com/in/sneha', flagged: false, verified: true, connectionCount: 7 },
  ];

  const interests = ['Fintech', 'EdTech', 'HealthTech', 'AI/ML', 'D2C', 'SaaS', 'Marketing', 'Consulting', 'Finance', 'Crypto', 'E-commerce', 'Content'];
  const goals = ['Project Partners', 'Friends', 'Networking', 'Startup Ideas', 'Case Comp Team', 'Fest Crew', 'Career Advice', 'Just Vibing'];

  const normalizePhone = (p) => p.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');
  const normalizeEmail = (e) => e.toLowerCase().trim();
  const verifyParticipant = (email, phone) => [...allowlist, ...coreAllowlist].find(p => normalizeEmail(p.email) === normalizeEmail(email) && normalizePhone(p.phone) === normalizePhone(phone));
  const isEmailRegistered = (email) => [...allowlist, ...coreAllowlist].some(p => normalizeEmail(p.email) === normalizeEmail(email));
  const isPhoneRegistered = (phone) => [...allowlist, ...coreAllowlist].some(p => normalizePhone(p.phone) === normalizePhone(phone));
  
  // Get mutual interests count
  const getMutualInterests = (p) => {
    if (!user || !user.interests || !p.interests) return [];
    return user.interests.filter(i => p.interests.includes(i));
  };

  useEffect(() => { 
    setLoading(true);
    
    // Load profiles from Firebase (real-time listener)
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const firebaseProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Merge with core team (core team is always present)
      const allProfiles = [...coreTeam];
      firebaseProfiles.forEach(fp => {
        if (!allProfiles.find(p => p.id === fp.id)) {
          allProfiles.push(fp);
        }
      });
      setProfiles(allProfiles.length > coreTeam.length ? allProfiles : [...coreTeam, ...sampleProfiles]);
      setLoading(false);
    }, (error) => {
      console.error('Error loading profiles:', error);
      setProfiles([...coreTeam, ...sampleProfiles]);
      setLoading(false);
    });

    // Load announcements from Firebase
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const firebaseAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firebaseAnnouncements.length > 0) {
        setAnnouncements(firebaseAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    }, (error) => console.error('Error loading announcements:', error));

    // Load feedbacks from Firebase
    const unsubFeedbacks = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
      const firebaseFeedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firebaseFeedbacks.length > 0) {
        setFeedbacks(firebaseFeedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    }, (error) => console.error('Error loading feedbacks:', error));

    return () => {
      unsubProfiles();
      unsubAnnouncements();
      unsubFeedbacks();
    };
  }, []);
  
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      notify('Refreshed!', 'info');
    }, 1000);
  };

  const notify = (msg, type = 'success') => setToast({ msg, type });
  
  // Firebase: Send connection request
  const sendRequest = async (p) => {
    if (!user || sentRequests.find(x => x.id === p.id) || connections.find(x => x.id === p.id)) return;
    setSentRequests([...sentRequests, p]); // Optimistic update
    notify('Request sent to ' + p.name);
    try {
      await setDoc(doc(db, 'users', user.id, 'sentRequests', p.id), { ...p, timestamp: new Date().toISOString() });
      await setDoc(doc(db, 'users', p.id, 'receivedRequests', user.id), { ...user, timestamp: new Date().toISOString() });
    } catch (e) {
      console.error('Error sending request:', e);
    }
  };

  // Firebase: Accept connection request
  const acceptRequest = async (p) => {
    if (!user) return;
    setReceivedRequests(receivedRequests.filter(x => x.id !== p.id)); // Optimistic
    setConnections([...connections, p]);
    notify('Connected with ' + p.name + '! 🎉');
    try {
      await setDoc(doc(db, 'users', user.id, 'connections', p.id), { ...p, connectedAt: new Date().toISOString() });
      await setDoc(doc(db, 'users', p.id, 'connections', user.id), { ...user, connectedAt: new Date().toISOString() });
      await deleteDoc(doc(db, 'users', user.id, 'receivedRequests', p.id)).catch(() => {});
      await deleteDoc(doc(db, 'users', p.id, 'sentRequests', user.id)).catch(() => {});
    } catch (e) {
      console.error('Error accepting:', e);
    }
  };

  // Firebase: Decline connection request
  const declineRequest = async (p) => {
    if (!user) return;
    setReceivedRequests(receivedRequests.filter(x => x.id !== p.id));
    notify('Declined', 'info');
    try {
      await deleteDoc(doc(db, 'users', user.id, 'receivedRequests', p.id));
      await deleteDoc(doc(db, 'users', p.id, 'sentRequests', user.id));
    } catch (e) {
      console.error('Error declining:', e);
    }
  };

  // Firebase: Cancel sent request
  const cancelRequest = async (p) => {
    if (!user) return;
    setSentRequests(sentRequests.filter(x => x.id !== p.id));
    notify('Cancelled', 'info');
    try {
      await deleteDoc(doc(db, 'users', user.id, 'sentRequests', p.id));
      await deleteDoc(doc(db, 'users', p.id, 'receivedRequests', user.id));
    } catch (e) {
      console.error('Error cancelling:', e);
    }
  };

  // Firebase: Flag user
  const flag = async (id, reason) => {
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, flagged: true, reason } : p));
    notify('Reported', 'info');
    try {
      await updateDoc(doc(db, 'profiles', id), { flagged: true, reason });
    } catch (e) {
      console.error('Error flagging:', e);
    }
  };

  // Firebase: Remove user (admin)
  const remove = async (id) => {
    setProfiles(ps => ps.filter(p => p.id !== id));
    notify('Deleted');
    try {
      await deleteDoc(doc(db, 'profiles', id));
    } catch (e) {
      console.error('Error removing:', e);
    }
  };

  // Firebase: Unflag user (admin)
  const unflag = async (id) => {
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, flagged: false, reason: null } : p));
    try {
      await updateDoc(doc(db, 'profiles', id), { flagged: false, reason: null });
    } catch (e) {
      console.error('Error unflagging:', e);
    }
  };

  // Firebase: Submit feedback
  const submitFeedback = async (fb) => {
    const feedbackData = { ...fb, id: Date.now().toString(), timestamp: new Date().toISOString() };
    setFeedbacks([feedbackData, ...feedbacks]);
    notify('Feedback submitted! 🙏');
    try {
      await setDoc(doc(db, 'feedbacks', feedbackData.id), feedbackData);
    } catch (e) {
      console.error('Error submitting feedback:', e);
    }
  };

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="card skeleton">
      <div className="card-top">
        <div className="skel-avatar"></div>
        <div className="skel-text-group">
          <div className="skel-text w70"></div>
          <div className="skel-text w50"></div>
        </div>
      </div>
      <div className="skel-text w90"></div>
      <div className="skel-tags">
        <div className="skel-tag"></div>
        <div className="skel-tag"></div>
        <div className="skel-tag"></div>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = ({ icon, title, subtitle, action, actionText }) => (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      {action && <button type="button" className="btn-main" onClick={action}>{actionText}</button>}
    </div>
  );

  // Pull to refresh component
  const PullToRefresh = ({ onRefresh, refreshing, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
      if (containerRef.current?.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const diff = Math.max(0, Math.min((currentY - startY.current) * 0.5, 80));
      setPullDistance(diff);
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60) {
        onRefresh();
      }
      setPullDistance(0);
      setIsPulling(false);
    };

    return (
      <div 
        ref={containerRef}
        className="ptr-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ptr-indicator" style={{ height: pullDistance, opacity: pullDistance / 60 }}>
          {refreshing ? <span className="ptr-spinner">↻</span> : <span>↓ Pull to refresh</span>}
        </div>
        {children}
      </div>
    );
  };

  const Landing = () => (
    <div className="page">
      <nav className="nav"><div className="logo">STRAT<span>E</span>GIA</div><button className="btn-ghost" onClick={() => setView('login')}>Sign In</button></nav>
      <main className="hero">
        <span className="chip">🎯 STRATEGIA 26</span>
        <h1>Decisions.<br/>Pressure.<br/><span>Composure.</span></h1>
        <p>Connect with business minds at Loyola College, Chennai</p>
        <button className="btn-main" onClick={() => setView('signup')}>Get Started</button>
        <button className="btn-link" onClick={() => setView('about')}>How it works →</button>
      </main>
      <section className="features">
        <div className="feat"><span>🔒</span><b>Private</b><p>Phone shared only when mutual</p></div>
        <div className="feat"><span>✅</span><b>Verified</b><p>Registered participants only</p></div>
        <div className="feat"><span>🤝</span><b>Mutual</b><p>Both must accept to connect</p></div>
        <div className="feat"><span>⏰</span><b>Temporary</b><p>Data deleted after event</p></div>
      </section>
      <footer>
        <div className="built-by">Built by <span>Strategia Core Team</span> 💙</div>
        <p>STRATEGIA 26 • Loyola College</p>
        <div className="foot-links"><a onClick={() => setView('privacy')}>Privacy</a><a onClick={() => setView('terms')}>Terms</a><a onClick={() => setView('adminLogin')}>Admin</a></div>
      </footer>
    </div>
  );

  const Signup = () => {
    const [step, setStep] = useState(1);
    const [f, setF] = useState({ name: '', email: '', phone: '', college: '', year: '', interests: [], lookingFor: [], bio: '', linkedin: '', avatar: '👤', visible: 'all', c1: false });
    const [err, setErr] = useState({});
    const [vStatus, setVStatus] = useState('idle');
    const [vError, setVError] = useState('');

    const verify = () => {
      if (!f.email.trim() || !f.phone.trim()) { setVError('Enter both email and phone'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setVError('Invalid email'); return; }
      if (!/^\d{10}$/.test(f.phone)) { setVError('Enter 10-digit mobile number'); return; }
      const fullPhone = '+91' + f.phone;
      setVStatus('checking'); setVError('');
      setTimeout(() => {
        const p = verifyParticipant(f.email, fullPhone);
        if (p) { setVStatus('verified'); setF(x => ({ ...x, name: p.name })); }
        else { setVStatus('failed'); const eEx = isEmailRegistered(f.email), pEx = isPhoneRegistered(fullPhone); setVError(eEx && !pEx ? 'Email found, phone doesn\'t match' : !eEx && pEx ? 'Phone found, email doesn\'t match' : 'Not in participant list'); }
      }, 800);
    };
    const next1 = () => { const e = {}; if (vStatus !== 'verified') e.v = 1; if (!f.college.trim()) e.college = 1; if (!f.year) e.year = 1; setErr(e); if (!Object.keys(e).length) setStep(2); };
    const next2 = () => { const e = {}; if (!f.interests.length) e.interests = 1; if (!f.lookingFor.length) e.lookingFor = 1; setErr(e); if (!Object.keys(e).length) setStep(3); };
    const submit = async () => { 
      if (!f.c1) { setErr({ consent: 1 }); return; } 
      if (profiles.find(p => normalizeEmail(p.email) === normalizeEmail(f.email))) { notify('Account exists!', 'info'); setView('login'); return; } 
      const u = { ...f, phone: '+91' + f.phone, id: Date.now() + '', flagged: false, verified: true, connectionCount: 0, createdAt: new Date().toISOString() }; 
      setUser(u);
      setProfiles(p => [...p, u]);
      setView('app');
      notify('Welcome to STRATEGIA Connect! 🎉');
      try {
        await setDoc(doc(db, 'profiles', u.id), u);
      } catch (e) {
        console.error('Error saving profile:', e);
      }
    };
    const tog = (k, v) => setF(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(i => i !== v) : [...x[k], v] }));

    return (
      <div className="page auth-page">
        <button className="back" onClick={() => setView('landing')}>← Back</button>
        <div className="auth-card">
          <div className="auth-head"><div className="auth-icon">S</div><h2>Create Profile</h2><div className="steps"><span className={step >= 1 ? 'on' : ''}>1</span><span className={step >= 2 ? 'on' : ''}>2</span><span className={step >= 3 ? 'on' : ''}>3</span></div></div>
          {step === 1 && (<div className="form">
            <div className="verify-notice"><span>🎫</span><div><b>Registered Participants Only</b><p>Enter your registration details</p></div></div>
            <label className={vStatus === 'failed' ? 'err' : ''}>Email<input type="email" value={f.email} onChange={e => { setF({ ...f, email: e.target.value }); setVStatus('idle'); }} placeholder="your.email@college.edu" disabled={vStatus === 'verified'} className={vStatus === 'verified' ? 'verified' : ''} /></label>
            <label className={vStatus === 'failed' ? 'err' : ''}>Phone<div className="phone-input"><span className="phone-prefix">+91</span><input type="tel" value={f.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setF({ ...f, phone: val }); setVStatus('idle'); }} placeholder="98765 43210" disabled={vStatus === 'verified'} className={vStatus === 'verified' ? 'verified' : ''} maxLength="10" /></div></label>
            {vStatus !== 'verified' && <button type="button" className="btn-verify" onClick={verify} disabled={vStatus === 'checking'}>{vStatus === 'checking' ? <span className="btn-loading">⏳</span> : '🔍 Verify'}</button>}
            {vError && <div className="error-box"><span>⚠️</span><p>{vError}</p></div>}
            {vStatus === 'verified' && (<><div className="verified-box"><span>✓</span><div><b>{f.name}</b><p>Verified participant</p></div></div><div className="divider"><span>Complete profile</span></div><label className={err.college ? 'err' : ''}>College<input value={f.college} onChange={e => setF({ ...f, college: e.target.value })} placeholder="Your institution" /></label><label className={err.year ? 'err' : ''}>Year<select value={f.year} onChange={e => setF({ ...f, year: e.target.value })}><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>MBA 1st</option><option>MBA 2nd</option><option>Alumni</option></select></label><button type="button" className="btn-main" onClick={next1}>Continue →</button></>)}
          </div>)}
          {step === 2 && (<div className="form">
            <label>Pick your avatar</label>
            <div className="avatar-inline">{avatarOptions.map(a => <button key={a} type="button" className={f.avatar === a ? 'on' : ''} onClick={() => setF({ ...f, avatar: a })}>{a}</button>)}</div>
            <label className={err.interests ? 'err' : ''}>Interests</label><div className="chips">{interests.map(i => <button key={i} type="button" className={f.interests.includes(i) ? 'on' : ''} onClick={() => tog('interests', i)}>{i}</button>)}</div>
            <label className={err.lookingFor ? 'err' : ''}>Looking For</label><div className="chips">{goals.map(i => <button key={i} type="button" className={f.lookingFor.includes(i) ? 'on' : ''} onClick={() => tog('lookingFor', i)}>{i}</button>)}</div>
            <label>Bio <small>(optional)</small><textarea value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} placeholder="Brief intro..." maxLength={120} /></label>
            <label>LinkedIn <small>(optional)</small><input value={f.linkedin} onChange={e => setF({ ...f, linkedin: e.target.value })} placeholder="linkedin.com/in/yourname" /></label>
            <div className="btn-row"><button type="button" className="btn-ghost" onClick={() => setStep(1)}>Back</button><button type="button" className="btn-main" onClick={next2}>Continue</button></div>
          </div>)}
          {step === 3 && (<div className="form">
            <div className="info-box">🔒 Phone shared only with mutual connections</div>
            <label>Visibility</label><div className="radios"><label className="radio"><input type="radio" checked={f.visible === 'all'} onChange={() => setF({ ...f, visible: 'all' })} /><span>Everyone can see my profile</span></label><label className="radio"><input type="radio" checked={f.visible === 'connections'} onChange={() => setF({ ...f, visible: 'connections' })} /><span>Only my connections</span></label></div>
            <label className={'check ' + (err.consent ? 'err' : '')}><input type="checkbox" checked={f.c1} onChange={e => setF({ ...f, c1: e.target.checked })} /><span>I consent to share my profile as per visibility settings</span></label>
            <div className="btn-row"><button type="button" className="btn-ghost" onClick={() => setStep(2)}>Back</button><button type="button" className="btn-main" onClick={submit}>Create Profile</button></div>
          </div>)}
        </div>
      </div>
    );
  };

  const Login = () => {
    const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [status, setStatus] = useState('idle'); const [error, setError] = useState('');
    const login = () => { 
      if (!email.trim() || !phone.trim()) { setError('Enter both fields'); return; } 
      if (!/^\d{10}$/.test(phone)) { setError('Enter 10-digit number'); return; }
      const fullPhone = '+91' + phone;
      setStatus('checking'); 
      setTimeout(() => { 
        const p = verifyParticipant(email, fullPhone); 
        if (!p) { setStatus('failed'); setError('Not found'); return; } 
        const existing = profiles.find(x => normalizeEmail(x.email) === normalizeEmail(email)); 
        if (existing) { setUser(existing); setView('app'); notify('Welcome back!'); } 
        else { setStatus('no-account'); setError('No profile yet'); } 
      }, 800); 
    };
    return (
      <div className="page auth-page">
        <button className="back" onClick={() => setView('landing')}>← Back</button>
        <div className="auth-card"><div className="auth-head"><div className="auth-icon">S</div><h2>Welcome Back</h2></div><div className="form"><label>Email<input type="email" value={email} onChange={e => { setEmail(e.target.value); setStatus('idle'); setError(''); }} placeholder="your.email@college.edu" /></label><label>Phone<div className="phone-input"><span className="phone-prefix">+91</span><input type="tel" value={phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(val); setStatus('idle'); setError(''); }} placeholder="98765 43210" maxLength="10" /></div></label>{error && <div className="error-box"><span>⚠️</span><p>{error}</p></div>}<button type="button" className="btn-main" onClick={login} disabled={status === 'checking'}>{status === 'checking' ? <span className="btn-loading">⏳</span> : 'Sign In'}</button>{status === 'no-account' && <button type="button" className="btn-ghost" onClick={() => setView('signup')}>Create Profile</button>}<p className="switch">New here? <a onClick={() => setView('signup')}>Create profile</a></p></div></div>
      </div>
    );
  };

  const AdminLogin = () => { const [code, setCode] = useState(''); const [err, setErr] = useState(false); return (<div className="page auth-page"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="auth-card"><div className="auth-head"><div className="auth-icon admin">🛡️</div><h2>Admin</h2></div><div className="form"><label>Code<input type="password" value={code} onChange={e => { setCode(e.target.value); setErr(false); }} placeholder="Enter admin code" /></label>{err && <p className="err-text">Invalid code</p>}<button type="button" className="btn-main" onClick={() => code === ADMIN ? (setIsAdmin(true), setView('admin')) : setErr(true)}>Enter</button></div></div></div>); };

  const Admin = () => { 
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const flagged = profiles.filter(p => p.flagged);
    const nonCoreProfiles = profiles.filter(p => !p.isCore);
    const list = adminTab === 'flagged' ? flagged : adminTab === 'feedback' || adminTab === 'announce' || adminTab === 'dashboard' || adminTab === 'report' ? [] : profiles; 
    
    // Dashboard stats
    const totalConnections = profiles.reduce((sum, p) => sum + (p.connectionCount || 0), 0) / 2; // Divide by 2 since connections are mutual
    const avgRating = feedbacks.length ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
    const topInterests = interests.map(i => ({ name: i, count: profiles.filter(p => p.interests?.includes(i)).length })).sort((a, b) => b.count - a.count).slice(0, 5);
    const collegeStats = [...new Set(profiles.map(p => p.college))].map(c => ({ name: c, count: profiles.filter(p => p.college === c).length })).sort((a, b) => b.count - a.count).slice(0, 5);
    
    const postAnnouncement = async () => {
      if (!newAnnouncement.trim()) return;
      const announcement = { id: Date.now().toString(), message: newAnnouncement.trim(), timestamp: new Date().toISOString() };
      setAnnouncements([announcement, ...announcements]);
      setNewAnnouncement('');
      notify('Announcement posted!');
      try {
        await setDoc(doc(db, 'announcements', announcement.id), announcement);
      } catch (e) {
        console.error('Error posting announcement:', e);
      }
    };
    
    const deleteAnnouncement = async (id) => {
      setAnnouncements(announcements.filter(a => a.id !== id));
      notify('Deleted', 'info');
      try {
        await deleteDoc(doc(db, 'announcements', id.toString()));
      } catch (e) {
        console.error('Error deleting announcement:', e);
      }
    };

    const generateReport = () => {
      const report = `
═══════════════════════════════════════════════════════════
           STRATEGIA CONNECT - POST-EVENT REPORT
═══════════════════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}

📊 OVERVIEW
───────────────────────────────────────────────────────────
Total Participants:     ${nonCoreProfiles.length}
Core Team Members:      ${profiles.filter(p => p.isCore).length}
Total Connections Made: ${Math.round(totalConnections)}
Feedback Submissions:   ${feedbacks.length}
Average Rating:         ${avgRating}/5 ⭐
Flagged Profiles:       ${flagged.length}

📈 TOP INTERESTS
───────────────────────────────────────────────────────────
${topInterests.map((i, idx) => `${idx + 1}. ${i.name}: ${i.count} participants`).join('\n')}

🏫 COLLEGES REPRESENTED
───────────────────────────────────────────────────────────
${collegeStats.map((c, idx) => `${idx + 1}. ${c.name}: ${c.count} participants`).join('\n')}

👥 PARTICIPANT LIST
───────────────────────────────────────────────────────────
${nonCoreProfiles.map(p => `• ${p.name} | ${p.college} | ${p.email}`).join('\n')}

💬 FEEDBACK SUMMARY
───────────────────────────────────────────────────────────
${feedbacks.length ? feedbacks.map(f => `[${f.rating}⭐] ${f.userName}: "${f.message}"`).join('\n') : 'No feedback collected'}

📢 ANNOUNCEMENTS POSTED
───────────────────────────────────────────────────────────
${announcements.length ? announcements.map(a => `[${new Date(a.timestamp).toLocaleDateString()}] ${a.message}`).join('\n') : 'No announcements posted'}

═══════════════════════════════════════════════════════════
           Thank you for using STRATEGIA Connect!
              Built with 💙 by Strategia Core Team
═══════════════════════════════════════════════════════════
      `;
      
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategia-connect-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Report downloaded!');
    };

    const exportCSV = () => {
      const headers = ['Name', 'Email', 'Phone', 'College', 'Year', 'Interests', 'Looking For', 'Bio', 'LinkedIn', 'Connections'];
      const rows = nonCoreProfiles.map(p => [
        p.name, p.email, p.phone, p.college, p.year,
        p.interests?.join('; ') || '', p.lookingFor?.join('; ') || '',
        p.bio || '', p.linkedin || '', p.connectionCount || 0
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strategia-participants-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('CSV exported!');
    };

    const exportFeedbackCSV = () => {
      if (!feedbacks.length) {
        notify('No feedback to export', 'info');
        return;
      }
      try {
        const headers = ['Timestamp', 'Name', 'Email', 'Event', 'Overall Rating', 'Event Rating', 'Judges Rating', 'Volunteers Rating', 'Q1', 'Q1 Rating', 'Q2', 'Q2 Rating', 'Q3', 'Q3 Rating', 'Suggestions'];
        const rows = feedbacks.map(f => [
          new Date(f.timestamp).toLocaleString(),
          f.userName || '',
          f.userEmail || '',
          f.event || '',
          f.rating || '',
          f.eventRating || '',
          f.judgesRating || '',
          f.volunteersRating || '',
          f.q1 || '',
          f.q1Rating || '',
          f.q2 || '',
          f.q2Rating || '',
          f.q3 || '',
          f.q3Rating || '',
          f.improvement || ''
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strategia-feedback-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('Feedback exported!');
      } catch (e) {
        console.error('Export error:', e);
        notify('Export failed', 'info');
      }
    };
    
    return (
      <div className="page app-page admin">
        <nav className="app-nav"><div className="logo sm">🛡️ Admin</div><button className="btn-ghost sm" onClick={() => { setIsAdmin(false); setView('landing'); }}>Exit</button></nav>
        <main className="app-main">
          <div className="tabs">
            <button type="button" className={adminTab === 'dashboard' ? 'on' : ''} onClick={() => setAdminTab('dashboard')}>📊</button>
            <button type="button" className={adminTab === 'all' ? 'on' : ''} onClick={() => setAdminTab('all')}>👥</button>
            <button type="button" className={adminTab === 'announce' ? 'on' : ''} onClick={() => setAdminTab('announce')}>📢</button>
            <button type="button" className={adminTab === 'feedback' ? 'on' : ''} onClick={() => setAdminTab('feedback')}>💬</button>
            <button type="button" className={adminTab === 'report' ? 'on' : ''} onClick={() => setAdminTab('report')}>📄</button>
          </div>

          {adminTab === 'dashboard' && (
            <div className="dashboard">
              <h3>📊 Real-time Dashboard</h3>
              <div className="dash-stats">
                <div className="dash-stat big">
                  <span className="dash-icon">👥</span>
                  <b>{nonCoreProfiles.length}</b>
                  <span>Participants</span>
                </div>
                <div className="dash-stat big">
                  <span className="dash-icon">🤝</span>
                  <b>{Math.round(totalConnections)}</b>
                  <span>Connections</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-icon">⭐</span>
                  <b>{avgRating}</b>
                  <span>Avg Rating</span>
                </div>
                <div className="dash-stat">
                  <span className="dash-icon">💬</span>
                  <b>{feedbacks.length}</b>
                  <span>Feedback</span>
                </div>
              </div>
              
              <div className="dash-section">
                <h4>🔥 Top Interests</h4>
                <div className="dash-bars">
                  {topInterests.map(i => (
                    <div key={i.name} className="dash-bar">
                      <span className="bar-label">{i.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(i.count / profiles.length) * 100}%` }}></div>
                      </div>
                      <span className="bar-count">{i.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-section">
                <h4>🏫 Top Colleges</h4>
                <div className="dash-bars">
                  {collegeStats.map(c => (
                    <div key={c.name} className="dash-bar">
                      <span className="bar-label">{c.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill college" style={{ width: `${(c.count / profiles.length) * 100}%` }}></div>
                      </div>
                      <span className="bar-count">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dash-section">
                <h4>📈 Activity</h4>
                <div className="activity-list">
                  <div className="activity-item">
                    <span>📢</span>
                    <p>{announcements.length} announcements posted</p>
                  </div>
                  <div className="activity-item">
                    <span>🚨</span>
                    <p>{flagged.length} profiles flagged</p>
                  </div>
                  <div className="activity-item">
                    <span>⭐</span>
                    <p>{profiles.filter(p => p.isCore).length} core team members</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {adminTab === 'announce' && (
            <div className="announce-section">
              <div className="announce-form">
                <textarea value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="Write an announcement..." maxLength={280} />
                <button type="button" className="btn-main" onClick={postAnnouncement} disabled={!newAnnouncement.trim()}>📢 Post Announcement</button>
              </div>
              <h4>Posted Announcements</h4>
              {announcements.length ? announcements.map(a => (
                <div key={a.id} className="announce-item">
                  <p>{a.message}</p>
                  <div className="announce-meta">
                    <span>{new Date(a.timestamp).toLocaleString()}</span>
                    <button type="button" onClick={() => deleteAnnouncement(a.id)}>🗑️</button>
                  </div>
                </div>
              )) : <EmptyState icon="📢" title="No announcements" subtitle="Post updates for all participants" />}
            </div>
          )}
          
          {adminTab === 'feedback' && (
            <div className="feedback-section">
              <div className="feedback-header">
                <h3>💬 Feedback ({feedbacks.length})</h3>
                <button type="button" className="btn-ghost sm" onClick={exportFeedbackCSV} disabled={!feedbacks.length}>📥 Export Excel</button>
              </div>
              <div className="feedback-list">{feedbacks.length ? feedbacks.map(fb => (
              <div key={fb.id} className="feedback-item">
                <div className="fb-header"><b>{fb.userName}</b><span className="fb-event-tag">{fb.event}</span></div>
                <div className="fb-ratings">
                  <div className="fb-rating-item"><span>Event</span><b>{fb.eventRating}/5</b></div>
                  <div className="fb-rating-item"><span>Judges</span><b>{fb.judgesRating}/5</b></div>
                  <div className="fb-rating-item"><span>Volunteers</span><b>{fb.volunteersRating}/5</b></div>
                </div>
                <div className="fb-specific">
                  <div className="fb-q"><span>{fb.q1}</span><b>{fb.q1Rating}/5 ⭐</b></div>
                  <div className="fb-q"><span>{fb.q2}</span><b>{fb.q2Rating}/5 ⭐</b></div>
                  <div className="fb-q"><span>{fb.q3}</span><b>{fb.q3Rating}/5 ⭐</b></div>
                </div>
                {fb.improvement && <p className="fb-text">💡 {fb.improvement}</p>}
                <span className="fb-time">{new Date(fb.timestamp).toLocaleDateString()}</span>
              </div>
            )) : <EmptyState icon="💬" title="No feedback yet" subtitle="Feedback from participants will appear here" />}</div>
            </div>
          )}

          {adminTab === 'report' && (
            <div className="report-section">
              <div className="report-card">
                <span>📄</span>
                <h4>Post-Event Report</h4>
                <p>Download a comprehensive report with all event statistics, participant data, and feedback.</p>
                <button type="button" className="btn-main" onClick={generateReport}>📥 Download Report (.txt)</button>
              </div>
              <div className="report-card">
                <span>📊</span>
                <h4>Export Participant Data</h4>
                <p>Export all participant profiles as a CSV file for further analysis.</p>
                <button type="button" className="btn-main" onClick={exportCSV}>📥 Export CSV</button>
              </div>
              <div className="report-preview">
                <h4>Report Preview</h4>
                <div className="preview-stats">
                  <div><b>{nonCoreProfiles.length}</b> Participants</div>
                  <div><b>{Math.round(totalConnections)}</b> Connections</div>
                  <div><b>{feedbacks.length}</b> Feedback</div>
                  <div><b>{avgRating}/5</b> Rating</div>
                </div>
              </div>
            </div>
          )}
          
          {(adminTab === 'all' || adminTab === 'flagged') && (
            <div className="admin-list">{list.length ? list.map(p => (
              <div key={p.id} className={'admin-item ' + (p.flagged ? 'flagged' : '')}>
                <span className="av sm">{p.avatar}</span>
                <div className="info"><b>{p.name}</b><span>{p.email}</span><span className="phone">📱 {p.phone}</span></div>
                <div className="acts">
                  {p.flagged && <button type="button" className="sm-btn green" onClick={() => unflag(p.id)}>✓</button>}
                  <button type="button" className="sm-btn red" onClick={() => window.confirm('Delete?') && remove(p.id)}>🗑️</button>
                </div>
              </div>
            )) : <EmptyState icon="👥" title="No profiles" subtitle={adminTab === 'flagged' ? 'No flagged profiles' : 'No profiles yet'} />}</div>
          )}
        </main>
      </div>
    ); 
  };

  const FeedbackForm = ({ user, onSubmit, feedbacks }) => {
    const [open, setOpen] = useState(false);
    const [event, setEvent] = useState('');
    const [eventRating, setEventRating] = useState(0);
    const [judgesRating, setJudgesRating] = useState(0);
    const [volunteersRating, setVolunteersRating] = useState(0);
    const [q1Rating, setQ1Rating] = useState(0);
    const [q2Rating, setQ2Rating] = useState(0);
    const [q3Rating, setQ3Rating] = useState(0);
    const [improvement, setImprovement] = useState('');
    
    // Check if user already submitted feedback
    const alreadySubmitted = feedbacks.some(f => f.userEmail === user?.email);

    const events = ['StrategIQ', 'Market Masters', 'VentureX', 'Case Quest'];
    
    // Event-specific questions
    const eventQuestions = {
      'StrategIQ': {
        desc: 'The Ultimate Business & Finance Quiz',
        q1: 'Were the questions challenging yet fair?',
        q2: 'Was the time per question appropriate?',
        q3: 'How was the quiz interface/buzzer system?'
      },
      'Market Masters': {
        desc: 'Live Trading & Portfolio Strategy',
        q1: 'How intuitive was the trading terminal?',
        q2: 'Was the market simulation realistic?',
        q3: 'Were the portfolio presentation guidelines clear?'
      },
      'VentureX': {
        desc: 'Shark Tank Style Pitching',
        q1: 'Was the pitching time sufficient?',
        q2: 'How helpful was the judges\' feedback?',
        q3: 'Were the evaluation criteria clear?'
      },
      'Case Quest': {
        desc: 'Case Study Competition',
        q1: 'Was the case study appropriately complex?',
        q2: 'Was the preparation time adequate?',
        q3: 'Were the presentation guidelines clear?'
      }
    };

    const currentQuestions = event ? eventQuestions[event] : null;

    const handleSubmit = () => {
      if (!event || !eventRating || !judgesRating || !volunteersRating || !q1Rating || !q2Rating || !q3Rating) return;
      onSubmit({ 
        userName: user.name, 
        userEmail: user.email, 
        event,
        eventRating, 
        judgesRating, 
        volunteersRating,
        q1: currentQuestions.q1,
        q1Rating,
        q2: currentQuestions.q2,
        q2Rating,
        q3: currentQuestions.q3,
        q3Rating,
        improvement: improvement.trim(),
        rating: Math.round((eventRating + judgesRating + volunteersRating + q1Rating + q2Rating + q3Rating) / 6)
      });
      setOpen(false);
    };

    const resetEventQuestions = () => {
      setQ1Rating(0);
      setQ2Rating(0);
      setQ3Rating(0);
    };

    // Show submitted state if user already gave feedback
    if (alreadySubmitted) return (<div className="feedback-card submitted"><span>✓</span><p>Thanks for your feedback!</p></div>);

    return (
      <div className="feedback-card">
        <div className="fb-toggle" onClick={() => setOpen(!open)}><div><span>💬</span><b>Event Feedback</b><p>Help us improve STRATEGIA</p></div><span className="arrow">{open ? '▲' : '▼'}</span></div>
        {open && (<div className="fb-form">
          <label>Which event did you participate in? <span className="required">*</span></label>
          <div className="fb-events">
            {events.map(e => (
              <button key={e} type="button" className={event === e ? 'on' : ''} onClick={() => { setEvent(e); resetEventQuestions(); }}>
                <b>{e}</b>
                <span>{eventQuestions[e].desc}</span>
              </button>
            ))}
          </div>
          
          {event && (<>
            <div className="fb-divider"><span>{event} Feedback</span></div>
            
            <label>Rate the overall event <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={eventRating >= n ? 'on' : ''} onClick={() => setEventRating(n)}>★</button>))}</div>
            
            <label>Rate the Judges <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={judgesRating >= n ? 'on' : ''} onClick={() => setJudgesRating(n)}>★</button>))}</div>
            
            <label>Rate the Volunteers <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={volunteersRating >= n ? 'on' : ''} onClick={() => setVolunteersRating(n)}>★</button>))}</div>
            
            <div className="fb-divider"><span>Event-Specific</span></div>
            
            <label>{currentQuestions.q1} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q1Rating >= n ? 'on' : ''} onClick={() => setQ1Rating(n)}>★</button>))}</div>
            
            <label>{currentQuestions.q2} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q2Rating >= n ? 'on' : ''} onClick={() => setQ2Rating(n)}>★</button>))}</div>
            
            <label>{currentQuestions.q3} <span className="required">*</span></label>
            <div className="rating-stars">{[1,2,3,4,5].map(n => (<button key={n} type="button" className={q3Rating >= n ? 'on' : ''} onClick={() => setQ3Rating(n)}>★</button>))}</div>
            
            <label>What could we have done better? <small>(optional)</small><textarea value={improvement} onChange={e => setImprovement(e.target.value)} placeholder="Your suggestions help us improve next year..." maxLength={500} /></label>
            
            <button type="button" className="btn-main" onClick={handleSubmit} disabled={!event || !eventRating || !judgesRating || !volunteersRating || !q1Rating || !q2Rating || !q3Rating}>Submit Feedback</button>
          </>)}
        </div>)}
      </div>
    );
  };

  const App = () => {
    const tab = appTab;
    const setTab = setAppTab;
    const listEndRef = useRef(null);
    
    // Memoized filtered results - only recalculates when dependencies change
    const filtered = useMemo(() => {
      return profiles.filter(p => { 
        if (p.id === user?.id || p.flagged) return false; 
        if (filter === 'core') return p.isCore; 
        if (filter === 'mutual') return getMutualInterests(p).length > 0;
        if (filter && !p.interests.includes(filter)) return false; 
        if (debouncedSearch) { 
          const s = debouncedSearch.toLowerCase(); 
          return p.name.toLowerCase().includes(s) || p.college.toLowerCase().includes(s) || p.interests.some(i => i.toLowerCase().includes(s)); 
        } 
        return true; 
      });
    }, [profiles, user?.id, filter, debouncedSearch]);
    
    // Paginated results - show only visibleCount items
    const paginatedResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
    const hasMore = filtered.length > visibleCount;
    
    // Load more function
    const loadMore = useCallback(() => {
      setVisibleCount(prev => Math.min(prev + 20, filtered.length));
    }, [filtered.length]);
    
    // Reset pagination when filter/search changes
    useEffect(() => {
      setVisibleCount(20);
    }, [filter, debouncedSearch]);
    
    // Memoized helper functions
    const isConnected = useCallback((id) => connections.some(c => c.id === id), [connections]);
    const isPending = useCallback((id) => sentRequests.some(r => r.id === id), [sentRequests]);
    const hasRequest = useCallback((id) => receivedRequests.some(r => r.id === id), [receivedRequests]);

    const handleLogout = () => {
      setUser(null);
      setView('landing');
      // Clear only session data, keep feedbacks and announcements for admin
      try {
        localStorage.removeItem('strategia_user');
        localStorage.removeItem('strategia_view');
        localStorage.removeItem('strategia_connections');
        localStorage.removeItem('strategia_sentRequests');
        localStorage.removeItem('strategia_receivedRequests');
      } catch (e) {}
    };

    return (
      <div className="page app-page">
        <nav className="app-nav"><div className="logo sm">STRAT<span>E</span>GIA</div><button className="btn-ghost sm" onClick={handleLogout}>Exit</button></nav>
        <div className="tab-bar">
          <button type="button" className={tab === 'discover' ? 'on' : ''} onClick={() => setTab('discover')}><span>🔍</span>Discover</button>
          <button type="button" className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}><span>📨</span>Requests{receivedRequests.length > 0 && <b>{receivedRequests.length}</b>}</button>
          <button type="button" className={tab === 'connections' ? 'on' : ''} onClick={() => setTab('connections')}><span>👥</span>Connected{connections.length > 0 && <b>{connections.length}</b>}</button>
          <button type="button" className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}><span>👤</span>Profile</button>
        </div>
        <main className="app-main">
          {announcements.length > 0 && (
            <div className="announcement-banner">
              <span>📢</span>
              <p>{announcements[0].message}</p>
            </div>
          )}
          {tab === 'discover' && (
            <PullToRefresh onRefresh={handleRefresh} refreshing={refreshing}>
              <div className="search-bar"><span>🔍</span><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, college, interest..." /></div>
              <button type="button" className="core-team-btn" onClick={() => setFilter('core')}>
                <span>⭐</span>
                <div>
                  <b>Connect with Core Team</b>
                  <p>Meet the organizers of STRATEGIA'26</p>
                </div>
                <span className="arrow">→</span>
              </button>
              <div className="filter-bar"><div className="filter-scroll"><button type="button" className={filter === 'mutual' ? 'on mutual' : 'mutual'} onClick={() => setFilter(filter === 'mutual' ? '' : 'mutual')}>✨ Mutual Interests</button><button type="button" className={filter === 'core' ? 'on core' : 'core'} onClick={() => setFilter(filter === 'core' ? '' : 'core')}>⭐ Core Team</button>{interests.slice(0, 6).map(i => <button key={i} type="button" className={filter === i ? 'on' : ''} onClick={() => setFilter(filter === i ? '' : i)}>{i}</button>)}</div></div>
              {debouncedSearch !== search && <div className="search-loading">Searching...</div>}
              <div className="results-count">{filtered.length} participant{filtered.length !== 1 ? 's' : ''} found</div>
              <div className="cards">
                {loading ? (
                  <>{[1,2,3].map(i => <SkeletonCard key={i} />)}</>
                ) : paginatedResults.length ? (<>
                  {paginatedResults.map(p => {
                  const mutual = getMutualInterests(p);
                  return (
                    <div key={p.id} className="card" onClick={() => setModal(p)}>
                      <div className="card-top">
                        <span className="av">{p.avatar}</span>
                        <div>
                          <b>{p.name} {p.isCore && <span className="core-badge">⭐</span>}</b>
                          <span>{p.college} • {p.isCore ? p.role : p.year}</span>
                          {p.connectionCount > 0 && <span className="conn-count">👥 {p.connectionCount} connections</span>}
                        </div>
                      </div>
                      {mutual.length > 0 && <div className="mutual-badge">✨ {mutual.length} mutual interest{mutual.length > 1 ? 's' : ''}</div>}
                      {p.bio && <p className="bio">{p.bio}</p>}
                      <div className="tags">{p.interests.slice(0, 3).map(i => <span key={i} className={user?.interests?.includes(i) ? 'mutual' : ''}>{i}</span>)}</div>
                      <div className="card-bot">
                        {isConnected(p.id) ? <span className="status-badge connected">✓ Connected</span> : 
                         isPending(p.id) ? <span className="status-badge pending">⏳ Pending</span> : 
                         hasRequest(p.id) ? <button type="button" className="btn-accept" onClick={e => { e.stopPropagation(); acceptRequest(p); }}>Accept</button> : 
                         <button type="button" className="btn-connect" onClick={e => { e.stopPropagation(); sendRequest(p); }}>Connect</button>}
                      </div>
                    </div>
                  );
                })}
                {hasMore && (
                  <button type="button" className="load-more-btn" onClick={loadMore}>
                    Load More ({filtered.length - visibleCount} remaining)
                  </button>
                )}
                </>) : (
                  <EmptyState 
                    icon={search || filter ? "🔍" : "👥"} 
                    title={search || filter ? "No matches found" : "No profiles yet"} 
                    subtitle={search || filter ? "Try different search terms or filters" : "Be the first to join!"} 
                    action={search || filter ? () => { setSearch(''); setFilter(''); } : null}
                    actionText="Clear filters"
                  />
                )}
              </div>
            </PullToRefresh>
          )}
          {tab === 'requests' && (
            <div className="requests-section">
              <h3>Received ({receivedRequests.length})</h3>
              {receivedRequests.length ? receivedRequests.map(p => (
                <div key={p.id} className="req-item">
                  <span className="av sm" onClick={() => setModal(p)} style={{cursor:'pointer'}}>{p.avatar}</span>
                  <div className="info" onClick={() => setModal(p)} style={{cursor:'pointer'}}><b>{p.name}</b><span>{p.college}</span></div>
                  <div className="req-actions">
                    <button type="button" className="btn-sm accept" onClick={() => acceptRequest(p)}>✓</button>
                    <button type="button" className="btn-sm decline" onClick={() => declineRequest(p)}>✕</button>
                  </div>
                </div>
              )) : <EmptyState icon="📭" title="No pending requests" subtitle="When someone wants to connect, you'll see them here" />}
              <h3>Sent ({sentRequests.length})</h3>
              {sentRequests.length ? sentRequests.map(p => (
                <div key={p.id} className="req-item">
                  <span className="av sm" onClick={() => setModal(p)} style={{cursor:'pointer'}}>{p.avatar}</span>
                  <div className="info" onClick={() => setModal(p)} style={{cursor:'pointer'}}><b>{p.name}</b><span>{p.college}</span></div>
                  <button type="button" className="btn-sm cancel" onClick={() => cancelRequest(p)}>Cancel</button>
                </div>
              )) : <EmptyState icon="📤" title="No sent requests" subtitle="Send connection requests from Discover" action={() => setTab('discover')} actionText="Discover People" />}
            </div>
          )}
          {tab === 'connections' && (
            <div className="cards">
              {connections.length ? connections.map(p => (
                <div key={p.id} className="card" onClick={() => setModal(p)}>
                  <div className="card-top"><span className="av">{p.avatar}</span><div><b>{p.name}</b><span>{p.college}</span></div></div>
                  <div className="contact-box">
                    <span>📱 {p.phone}</span>
                    <div className="contact-links">
                      <a href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="wa-btn">💬 WhatsApp</a>
                      {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}
                    </div>
                  </div>
                </div>
              )) : <EmptyState icon="🤝" title="No connections yet" subtitle="Connect with participants to see their contact info" action={() => setTab('discover')} actionText="Discover People" />}
            </div>
          )}
          {tab === 'profile' && user && (
            <div className="profile-section">
              <div className="profile-card">
                <span className="av lg">{user.avatar}</span>
                <h2>{user.name}</h2>
                <p>{user.college} • {user.year}</p>
                <p className="contact-info">📱 {user.phone}</p>
                <p className="contact-info">✉️ {user.email}</p>
                {user.linkedin && <a className="linkedin-link" href={user.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn Profile</a>}
                <div className="stats-row">
                  <div className="mini-stat"><b>{connections.length}</b><span>Connections</span></div>
                  <div className="mini-stat"><b>{sentRequests.length}</b><span>Pending</span></div>
                </div>
                {user.bio && <p className="bio">{user.bio}</p>}
                <div className="tags">{user.interests.map(i => <span key={i}>{i}</span>)}</div>
                <button type="button" className="btn-qr" onClick={() => setShowQR(true)}>📱 Share Profile (QR Code)</button>
              </div>
              <FeedbackForm user={user} onSubmit={submitFeedback} feedbacks={feedbacks} />
              <div className="settings"><h4>Settings</h4><label>Visibility<select value={user.visible} onChange={e => setUser({ ...user, visible: e.target.value })}><option value="all">Everyone</option><option value="connections">Connections only</option></select></label></div>
              <div className="danger"><h4>⚠️ Delete Profile</h4><button type="button" className="btn-danger" onClick={() => window.confirm('Delete profile?') && (setUser(null), setView('landing'))}>Delete</button></div>
            </div>
          )}
        </main>
        {modal && (
          <div className="modal-bg" onClick={() => setModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button type="button" className="close" onClick={() => setModal(null)}>✕</button>
              <div className="modal-top">
                <span className="av lg">{modal.avatar}</span>
                <h2>{modal.name} {modal.isCore && <span className="core-badge">⭐ Core</span>}</h2>
                <p>{modal.college} • {modal.isCore ? modal.role : modal.year}</p>
                {modal.connectionCount > 0 && <span className="modal-conn-count">👥 {modal.connectionCount} connections</span>}
              </div>
              {getMutualInterests(modal).length > 0 && (
                <div className="modal-mutual">
                  <span>✨</span>
                  <p>You share {getMutualInterests(modal).length} interest{getMutualInterests(modal).length > 1 ? 's' : ''}: {getMutualInterests(modal).join(', ')}</p>
                </div>
              )}
              {modal.bio && <div className="modal-sec"><h4>About</h4><p>{modal.bio}</p></div>}
              <div className="modal-sec"><h4>Interests</h4><div className="tags">{modal.interests.map(i => <span key={i} className={user?.interests?.includes(i) ? 'mutual' : ''}>{i}</span>)}</div></div>
              <div className="modal-sec"><h4>Looking For</h4><div className="tags">{modal.lookingFor.map(i => <span key={i}>{i}</span>)}</div></div>
              {isConnected(modal.id) && (<div className="modal-sec contact"><h4>Contact</h4><p>📱 {modal.phone}</p><div className="contact-links"><a href={`https://wa.me/${modal.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="wa-btn">💬 WhatsApp</a>{modal.linkedin && <a href={modal.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}</div></div>)}
              <div className="modal-bot">
                {isConnected(modal.id) ? <span className="connected-badge">✓ Connected</span> : 
                 isPending(modal.id) ? <span className="pending-badge">⏳ Request Sent</span> : 
                 hasRequest(modal.id) ? (<div className="modal-actions"><button type="button" className="btn-main" onClick={() => { acceptRequest(modal); setModal(null); }}>Accept Request</button><button type="button" className="btn-ghost" onClick={() => { declineRequest(modal); setModal(null); }}>Decline</button></div>) : 
                 <button type="button" className="btn-main" onClick={() => { sendRequest(modal); setModal(null); }}>Send Request</button>}
                <button type="button" className="btn-report" onClick={() => { setReport(modal); setModal(null); }}>🚩 Report</button>
              </div>
            </div>
          </div>
        )}
        {report && (<div className="modal-bg" onClick={() => setReport(null)}><div className="modal sm" onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setReport(null)}>✕</button><h2>Report {report.name}</h2><select id="reason"><option value="">Select reason</option><option>Inappropriate</option><option>Spam/Fake</option><option>Harassment</option><option>Other</option></select><div className="modal-bot"><button type="button" className="btn-ghost" onClick={() => setReport(null)}>Cancel</button><button type="button" className="btn-danger" onClick={() => { const r = document.getElementById('reason').value; if (r) { flag(report.id, r); setReport(null); } }}>Submit</button></div></div></div>)}
        {showQR && user && (
          <div className="modal-bg" onClick={() => setShowQR(false)}>
            <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
              <button type="button" className="close" onClick={() => setShowQR(false)}>✕</button>
              <div className="qr-content">
                <h2>Share Your Profile</h2>
                <p>Let others scan to connect with you</p>
                <div className="qr-code">
                  <svg viewBox="0 0 200 200" className="qr-svg">
                    {/* QR Code Pattern - Simplified visual representation */}
                    <rect x="20" y="20" width="50" height="50" fill="#fff"/>
                    <rect x="25" y="25" width="40" height="40" fill="#000"/>
                    <rect x="30" y="30" width="30" height="30" fill="#fff"/>
                    <rect x="35" y="35" width="20" height="20" fill="#000"/>
                    <rect x="130" y="20" width="50" height="50" fill="#fff"/>
                    <rect x="135" y="25" width="40" height="40" fill="#000"/>
                    <rect x="140" y="30" width="30" height="30" fill="#fff"/>
                    <rect x="145" y="35" width="20" height="20" fill="#000"/>
                    <rect x="20" y="130" width="50" height="50" fill="#fff"/>
                    <rect x="25" y="135" width="40" height="40" fill="#000"/>
                    <rect x="30" y="140" width="30" height="30" fill="#fff"/>
                    <rect x="35" y="145" width="20" height="20" fill="#000"/>
                    {/* Data pattern */}
                    <rect x="80" y="20" width="10" height="10" fill="#000"/>
                    <rect x="95" y="20" width="10" height="10" fill="#000"/>
                    <rect x="110" y="20" width="10" height="10" fill="#000"/>
                    <rect x="80" y="35" width="10" height="10" fill="#000"/>
                    <rect x="110" y="35" width="10" height="10" fill="#000"/>
                    <rect x="80" y="80" width="40" height="40" fill="#000"/>
                    <rect x="85" y="85" width="30" height="30" fill="#fff"/>
                    <rect x="90" y="90" width="20" height="20" fill="#000"/>
                    <rect x="20" y="80" width="10" height="10" fill="#000"/>
                    <rect x="35" y="80" width="10" height="10" fill="#000"/>
                    <rect x="50" y="80" width="10" height="10" fill="#000"/>
                    <rect x="130" y="80" width="10" height="10" fill="#000"/>
                    <rect x="150" y="80" width="10" height="10" fill="#000"/>
                    <rect x="170" y="80" width="10" height="10" fill="#000"/>
                    <rect x="80" y="130" width="10" height="10" fill="#000"/>
                    <rect x="95" y="145" width="10" height="10" fill="#000"/>
                    <rect x="110" y="130" width="10" height="10" fill="#000"/>
                    <rect x="130" y="130" width="10" height="10" fill="#000"/>
                    <rect x="150" y="150" width="10" height="10" fill="#000"/>
                    <rect x="170" y="170" width="10" height="10" fill="#000"/>
                  </svg>
                </div>
                <div className="qr-profile">
                  <span className="av">{user.avatar}</span>
                  <div>
                    <b>{user.name}</b>
                    <span>{user.college}</span>
                  </div>
                </div>
                <p className="qr-hint">In production, this will be a real scannable QR code linked to your profile</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Privacy = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>Privacy Policy</h1><section><h3>Data</h3><p>Name, email, phone, college, interests, LinkedIn. Phone only shared with mutual connections.</p></section><section><h3>Verification</h3><p>Only pre-registered participants can create accounts.</p></section><section><h3>Retention</h3><p>All data deleted 7 days after STRATEGIA 26.</p></section></div></div>);
  const Terms = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>Terms</h1><section><h3>Eligibility</h3><p>Registered STRATEGIA 26 participants only.</p></section><section><h3>Conduct</h3><p>Be respectful. No inappropriate content.</p></section><section><h3>Connections</h3><p>Both parties must accept to connect and share contact info.</p></section></div></div>);
  const About = () => (<div className="page static"><button className="back" onClick={() => setView('landing')}>← Back</button><div className="static-card"><h1>How It Works</h1><div className="how"><div><b>1</b><h4>Verify</h4><p>Use registered email + phone</p></div><div><b>2</b><h4>Create</h4><p>Build your profile</p></div><div><b>3</b><h4>Request</h4><p>Send connection requests</p></div><div><b>4</b><h4>Connect</h4><p>Both accept = phone revealed</p></div></div><button type="button" className="btn-main" onClick={() => setView('signup')}>Get Started</button></div></div>);
  const Toast = () => toast && <div className={'toast ' + toast.type}>{toast.type === 'info' ? 'ℹ️' : '✓'} {toast.msg}</div>;

  const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased}html{font-size:16px}body{font-family:'Inter',-apple-system,system-ui,sans-serif;background:#080c14;color:#fff;line-height:1.5;overflow-x:hidden;min-height:100dvh;touch-action:manipulation}input,select,textarea,button{font-family:inherit;font-size:16px;border:none;outline:none}.page{min-height:100dvh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}.nav{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;position:sticky;top:0;background:rgba(8,12,20,.97);backdrop-filter:blur(12px);z-index:50;border-bottom:1px solid rgba(255,255,255,.06)}.logo{font-weight:800;font-size:1.1rem}.logo span{color:#e63946}.logo.sm{font-size:1rem}.btn-main{background:#e63946;color:#fff;padding:.8rem 1.25rem;border-radius:12px;font-weight:600;font-size:.9rem;cursor:pointer;width:100%;transition:transform .1s,opacity .1s;-webkit-user-select:none;user-select:none}.btn-main:active{transform:scale(.98);opacity:.9}.btn-main:disabled{background:#333;color:#666}.btn-loading{animation:spin 1s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.btn-ghost{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:#fff;padding:.5rem .8rem;border-radius:10px;font-weight:500;font-size:.8rem;cursor:pointer}.btn-ghost.sm{padding:.4rem .6rem;font-size:.75rem}.btn-ghost:active{background:rgba(255,255,255,.05)}.btn-link{background:none;color:rgba(255,255,255,.5);font-size:.85rem;cursor:pointer;margin-top:.75rem;padding:.5rem}.btn-danger{background:transparent;border:1.5px solid #e63946;color:#e63946;padding:.7rem;border-radius:10px;font-weight:600;width:100%}.hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem 1.25rem}.chip{background:rgba(230,57,70,.15);color:#ff6b6b;padding:.3rem .7rem;border-radius:50px;font-size:.7rem;font-weight:600;margin-bottom:1.25rem}.hero h1{font-size:2rem;font-weight:800;line-height:1.1;margin-bottom:.7rem}.hero h1 span{color:#e63946}.hero p{color:rgba(255,255,255,.5);margin-bottom:1.5rem;font-size:.85rem;max-width:260px}.features{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:0 1rem 1.5rem}.feat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.75rem .6rem;text-align:center}.feat span{font-size:1.2rem;display:block;margin-bottom:.3rem}.feat b{font-size:.7rem;display:block;margin-bottom:.15rem}.feat p{font-size:.6rem;color:rgba(255,255,255,.4);line-height:1.3}footer{padding:1.25rem;text-align:center;border-top:1px solid rgba(255,255,255,.06)}.built-by{font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.3rem}.built-by span{color:#e63946;font-weight:600}footer p{font-size:.65rem;color:rgba(255,255,255,.3);margin-bottom:.4rem}.foot-links{display:flex;justify-content:center;gap:.8rem}.foot-links a{color:rgba(255,255,255,.4);font-size:.7rem;cursor:pointer;padding:.2rem}.auth-page{padding:.75rem}.back{position:absolute;top:.75rem;left:.75rem;background:none;color:rgba(255,255,255,.5);font-size:.85rem;cursor:pointer;padding:.4rem;z-index:10}.auth-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:1.25rem;margin-top:2.75rem;width:100%;max-width:360px;margin-left:auto;margin-right:auto}.auth-head{text-align:center;margin-bottom:1.25rem}.auth-icon{width:42px;height:42px;background:#e63946;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;margin:0 auto .7rem}.auth-icon.admin{background:#f59e0b}.auth-head h2{font-size:1.1rem}.steps{display:flex;justify-content:center;gap:.35rem;margin-top:.5rem}.steps span{width:24px;height:24px;background:rgba(255,255,255,.08);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:600;color:rgba(255,255,255,.35)}.steps span.on{background:#e63946;color:#fff}.form{display:flex;flex-direction:column;gap:.8rem}.form label{font-size:.8rem;font-weight:500;color:rgba(255,255,255,.7)}.form label.err{color:#ff6b6b}.form input,.form select,.form textarea{width:100%;padding:.75rem .85rem;background:rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;margin-top:.3rem}.form input:focus,.form select:focus{border-color:#e63946}.form input:disabled{opacity:.5}.form input.verified{border-color:#10b981;background:rgba(16,185,129,.08)}.form textarea{min-height:65px;resize:none}.form small{font-size:.65rem;color:rgba(255,255,255,.35);margin-left:.2rem}.verify-notice{display:flex;gap:.6rem;background:rgba(230,57,70,.1);border:1px solid rgba(230,57,70,.2);padding:.8rem;border-radius:10px}.verify-notice span{font-size:1.2rem}.verify-notice b{font-size:.75rem;color:#ff6b6b;display:block;margin-bottom:.1rem}.verify-notice p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.btn-verify{background:rgba(16,185,129,.12);border:1.5px solid #10b981;color:#10b981;padding:.75rem;border-radius:10px;font-weight:600;font-size:.85rem;cursor:pointer;width:100%}.btn-verify:disabled{opacity:.5}.verified-box{display:flex;gap:.6rem;align-items:center;background:rgba(16,185,129,.12);border:1px solid #10b981;padding:.8rem;border-radius:10px}.verified-box span{font-size:1.25rem;color:#10b981}.verified-box b{font-size:.85rem;color:#10b981;display:block}.verified-box p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.error-box{display:flex;gap:.5rem;background:rgba(230,57,70,.1);border:1px solid rgba(230,57,70,.25);padding:.7rem;border-radius:10px}.error-box span{font-size:1rem}.error-box p{font-size:.75rem;color:#ff6b6b;margin:0;flex:1}.divider{display:flex;align-items:center;gap:.6rem;margin:.3rem 0}.divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}.divider span{font-size:.65rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.04em}.avatar-section{text-align:center;margin-bottom:.4rem}.avatar-preview{display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;padding:.4rem}.avatar-preview span{font-size:2.75rem;display:block;margin-bottom:.2rem}.avatar-preview small{font-size:.65rem;color:rgba(255,255,255,.4)}.avatar-picker{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem;padding:.65rem;background:rgba(0,0,0,.3);border-radius:10px;margin-top:.4rem}.avatar-picker button{width:38px;height:38px;font-size:1.35rem;background:rgba(255,255,255,.05);border:2px solid transparent;border-radius:9px;cursor:pointer}.avatar-picker button.on{border-color:#e63946;background:rgba(230,57,70,.15)}.chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}.chips button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.4rem .7rem;border-radius:50px;font-size:.7rem;cursor:pointer}.chips button.on{background:rgba(230,57,70,.18);border-color:#e63946;color:#ff6b6b}.btn-row{display:flex;gap:.6rem;margin-top:.3rem}.btn-row .btn-ghost{flex:1}.btn-row .btn-main{flex:2}.info-box{background:rgba(230,57,70,.08);border:1px solid rgba(230,57,70,.18);padding:.7rem;border-radius:10px;font-size:.75rem;text-align:center}.radios{display:flex;flex-direction:column;gap:.35rem;margin-top:.3rem}.radio{display:flex;align-items:center;gap:.5rem;padding:.7rem;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:10px;cursor:pointer;font-size:.75rem}.radio input{accent-color:#e63946;width:16px;height:16px}.check{display:flex;align-items:flex-start;gap:.6rem;font-size:.7rem;color:rgba(255,255,255,.5);cursor:pointer;padding:.7rem;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:10px}.check.err{border-color:rgba(255,107,107,.3);color:#ff6b6b}.check input{margin-top:1px;accent-color:#e63946;width:16px;height:16px;flex-shrink:0}.check span{line-height:1.35}.switch{text-align:center;font-size:.75rem;color:rgba(255,255,255,.4);margin-top:.3rem}.switch a{color:#e63946;cursor:pointer}.err-text{color:#ff6b6b;font-size:.7rem;text-align:center}.app-page{padding-bottom:64px}.app-page.admin{padding-bottom:0}.app-nav{display:flex;justify-content:space-between;align-items:center;padding:.65rem .8rem;background:rgba(8,12,20,.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;z-index:50}.tab-bar{display:flex;position:fixed;bottom:0;left:0;right:0;background:rgba(8,12,20,.98);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.08);padding:.35rem .2rem;padding-bottom:calc(.35rem + env(safe-area-inset-bottom));z-index:100}.tab-bar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.35rem 0;background:none;color:rgba(255,255,255,.4);font-size:.55rem;font-weight:500;cursor:pointer;position:relative;-webkit-user-select:none}.tab-bar button span{font-size:1.15rem}.tab-bar button.on{color:#e63946}.tab-bar button b{position:absolute;top:0;right:50%;transform:translateX(12px);background:#e63946;color:#fff;font-size:.5rem;padding:.08rem .28rem;border-radius:50px;min-width:13px;text-align:center}.app-main{padding:.8rem;flex:1;-webkit-overflow-scrolling:touch}.ptr-container{min-height:100%}.ptr-indicator{display:flex;align-items:center;justify-content:center;font-size:.75rem;color:rgba(255,255,255,.5);overflow:hidden}.ptr-spinner{animation:spin 1s linear infinite}.search-bar{display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:0 .7rem;margin-bottom:.65rem}.search-bar span{font-size:.95rem;color:rgba(255,255,255,.4)}.search-bar input{flex:1;background:none;border:none;padding:.65rem 0;color:#fff}.search-bar input::placeholder{color:rgba(255,255,255,.35)}.filter-bar{margin-bottom:.75rem;overflow:hidden}.filter-scroll{display:flex;gap:.3rem;overflow-x:auto;padding-bottom:.2rem;scrollbar-width:none;-webkit-overflow-scrolling:touch}.filter-scroll::-webkit-scrollbar{display:none}.filter-scroll button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);padding:.35rem .65rem;border-radius:50px;font-size:.65rem;white-space:nowrap;flex-shrink:0;cursor:pointer}.filter-scroll button.on{background:#e63946;border-color:#e63946;color:#fff}.filter-scroll button.core{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#fbbf24}.filter-scroll button.core.on{background:#f59e0b;color:#000}.filter-scroll button.mutual{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.3);color:#c084fc}.filter-scroll button.mutual.on{background:#a855f7;color:#fff}.cards{display:flex;flex-direction:column;gap:.65rem;align-items:stretch}.cards .empty-state{width:100%}.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:.8rem;cursor:pointer;-webkit-user-select:none}.card:active{border-color:rgba(230,57,70,.4)}.card.skeleton{pointer-events:none}.card-top{display:flex;gap:.55rem;margin-bottom:.45rem}.av{width:52px;height:52px;min-width:52px;min-height:52px;background:rgba(255,255,255,.08);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;line-height:1;text-align:center}.av.lg{width:70px;height:70px;min-width:70px;min-height:70px;font-size:42px;border-radius:14px}.av.sm{width:40px;height:40px;min-width:40px;min-height:40px;font-size:24px;border-radius:10px}.card-top b{font-size:.8rem;display:flex;align-items:center;gap:.25rem;flex-wrap:wrap}.card-top>span.av{font-size:32px}.card-top div span{font-size:.65rem;color:rgba(255,255,255,.45);display:block}.conn-count{color:rgba(255,255,255,.35);font-size:.6rem;margin-top:.1rem}.core-badge{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#000;font-size:.5rem;padding:.08rem .3rem;border-radius:50px;font-weight:600}.mutual-badge{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;font-size:.65rem;padding:.3rem .6rem;border-radius:8px;margin-bottom:.4rem;display:inline-block}.bio{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:.45rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.tags{display:flex;flex-wrap:wrap;gap:.25rem;margin-bottom:.4rem}.tags span{background:rgba(230,57,70,.1);color:#ff8a8a;padding:.18rem .45rem;border-radius:50px;font-size:.6rem}.tags span.mutual{background:rgba(168,85,247,.15);color:#c084fc;border:1px solid rgba(168,85,247,.3)}.card-bot{display:flex;justify-content:flex-end;padding-top:.45rem;border-top:1px solid rgba(255,255,255,.05)}.btn-connect{background:#e63946;color:#fff;padding:.35rem .8rem;border-radius:8px;font-size:.7rem;font-weight:600;cursor:pointer}.btn-accept{background:#10b981;color:#fff;padding:.35rem .8rem;border-radius:8px;font-size:.7rem;font-weight:600;cursor:pointer}.status-badge{font-size:.65rem;padding:.25rem .55rem;border-radius:50px}.status-badge.connected{background:rgba(16,185,129,.15);color:#10b981}.status-badge.pending{background:rgba(255,255,255,.08);color:rgba(255,255,255,.5)}.contact-box{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);padding:.55rem .7rem;border-radius:9px;display:flex;justify-content:space-between;align-items:center;margin-top:.4rem}.contact-box span{font-size:.75rem;color:#10b981}.contact-box a{font-size:.7rem;color:#3b82f6;text-decoration:none}.contact-links{display:flex;gap:.5rem;align-items:center}.wa-btn{background:rgba(37,211,102,.15);color:#25d366 !important;padding:.25rem .5rem;border-radius:6px;font-weight:500}.empty-state{text-align:center;padding:2.5rem 1.5rem;display:flex;flex-direction:column;align-items:center}.empty-icon{font-size:3rem;margin-bottom:.75rem;opacity:.8}.empty-state h3{font-size:.9rem;color:rgba(255,255,255,.7);margin-bottom:.35rem}.empty-state p{font-size:.75rem;color:rgba(255,255,255,.4);margin-bottom:1rem;max-width:220px}.empty-state .btn-main{width:auto;padding:.6rem 1.25rem}.skel-avatar{width:38px;height:38px;background:rgba(255,255,255,.08);border-radius:10px;animation:pulse 1.5s infinite}.skel-text-group{flex:1}.skel-text{height:12px;background:rgba(255,255,255,.08);border-radius:6px;margin-bottom:.4rem;animation:pulse 1.5s infinite}.skel-text.w70{width:70%}.skel-text.w50{width:50%}.skel-text.w90{width:90%;margin:.5rem 0}.skel-tags{display:flex;gap:.25rem}.skel-tag{width:50px;height:20px;background:rgba(255,255,255,.08);border-radius:50px;animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.mt{margin-top:.75rem}.requests-section h3{font-size:.8rem;color:rgba(255,255,255,.5);margin:1rem 0 .55rem;padding-top:.45rem;border-top:1px solid rgba(255,255,255,.06)}.requests-section h3:first-child{margin-top:0;padding-top:0;border-top:none}.req-item{display:flex;align-items:center;gap:.55rem;padding:.65rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;margin-bottom:.4rem}.req-item .info{flex:1;min-width:0}.req-item b{font-size:.8rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.req-item span{font-size:.65rem;color:rgba(255,255,255,.45)}.req-actions{display:flex;gap:.3rem}.btn-sm{width:32px;height:32px;border-radius:8px;font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;border:none}.btn-sm.accept{background:#10b981;color:#fff}.btn-sm.decline{background:rgba(230,57,70,.15);color:#e63946}.btn-sm.cancel{width:auto;padding:0 .65rem;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);font-size:.65rem}.muted{color:rgba(255,255,255,.3);font-size:.75rem;text-align:center;padding:1rem}.profile-section{display:flex;flex-direction:column;gap:.75rem}.profile-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:1.1rem;text-align:center}.profile-card .av{margin:0 auto .55rem}.profile-card h2{font-size:1rem;margin-bottom:.15rem}.profile-card>p{font-size:.7rem;color:rgba(255,255,255,.45)}.profile-card .contact-info{font-size:.75rem;color:rgba(255,255,255,.55);margin:.1rem 0}.profile-card .linkedin-link{display:inline-block;font-size:.75rem;color:#3b82f6;margin:.3rem 0;text-decoration:none}.stats-row{display:flex;justify-content:center;gap:1.5rem;margin:.75rem 0}.mini-stat{text-align:center}.mini-stat b{font-size:1.1rem;display:block;color:#e63946}.mini-stat span{font-size:.6rem;color:rgba(255,255,255,.45)}.profile-card .bio{margin:.55rem 0;text-align:center}.profile-card .tags{justify-content:center;margin-top:.45rem}.settings,.danger{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:.75rem}.settings h4,.danger h4{font-size:.8rem;margin-bottom:.55rem}.settings label{display:flex;justify-content:space-between;align-items:center;font-size:.75rem}.settings select{padding:.35rem .55rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:#fff;font-size:.75rem}.danger{border-color:rgba(230,57,70,.25);border-style:dashed}.feedback-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;overflow:hidden}.feedback-card.submitted{padding:1.25rem;text-align:center}.feedback-card.submitted span{font-size:2rem;color:#10b981;display:block;margin-bottom:.35rem}.feedback-card.submitted p{color:rgba(255,255,255,.6);font-size:.8rem}.fb-toggle{display:flex;align-items:center;justify-content:space-between;padding:.75rem;cursor:pointer}.fb-toggle div{display:flex;align-items:center;gap:.55rem}.fb-toggle span:first-child{font-size:1.25rem}.fb-toggle b{font-size:.8rem;display:block}.fb-toggle p{font-size:.65rem;color:rgba(255,255,255,.45);margin:0}.fb-toggle .arrow{color:rgba(255,255,255,.4);font-size:.7rem}.fb-form{padding:0 .75rem .75rem;border-top:1px solid rgba(255,255,255,.06)}.fb-form label{display:block;font-size:.75rem;color:rgba(255,255,255,.6);margin-top:.65rem;margin-bottom:.3rem}.fb-form .required{color:#e63946}.rating-stars{display:flex;gap:.25rem}.rating-stars button{background:none;border:none;font-size:1.5rem;color:rgba(255,255,255,.2);cursor:pointer;padding:.15rem}.rating-stars button.on{color:#fbbf24}.fb-types{display:flex;flex-wrap:wrap;gap:.25rem}.fb-types button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);padding:.35rem .6rem;border-radius:50px;font-size:.65rem;cursor:pointer}.fb-types button.on{background:rgba(230,57,70,.15);border-color:#e63946;color:#ff6b6b}.fb-form textarea{width:100%;padding:.6rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.8rem;min-height:70px;resize:none;margin-top:.25rem}.fb-form .btn-main{margin-top:.65rem}.feedback-list{display:flex;flex-direction:column;gap:.4rem}.feedback-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.65rem}.fb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem}.fb-header b{font-size:.8rem}.fb-header span{font-size:.7rem;color:#fbbf24}.fb-type{font-size:.6rem;color:#e63946;background:rgba(230,57,70,.1);display:inline-block;padding:.15rem .4rem;border-radius:50px;margin-bottom:.35rem}.fb-text{font-size:.75rem;color:rgba(255,255,255,.7);line-height:1.4;margin-bottom:.35rem}.fb-time{font-size:.6rem;color:rgba(255,255,255,.35)}.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:flex-end;justify-content:center;z-index:200}.modal{background:#0d1117;border:1px solid rgba(255,255,255,.1);border-radius:18px 18px 0 0;width:100%;max-width:400px;max-height:82vh;overflow-y:auto;position:relative;padding-bottom:env(safe-area-inset-bottom);-webkit-overflow-scrolling:touch}.modal.sm{max-height:42vh}.close{position:absolute;top:.75rem;right:.75rem;background:rgba(255,255,255,.1);width:28px;height:28px;border-radius:50%;color:#fff;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center}.modal-top{text-align:center;padding:1.1rem 1.1rem .75rem}.modal-top .av{margin:0 auto .55rem}.modal-top h2{font-size:1rem;display:flex;align-items:center;justify-content:center;gap:.3rem;flex-wrap:wrap}.modal-top p{font-size:.7rem;color:rgba(255,255,255,.45);margin-top:.1rem}.modal-conn-count{font-size:.65rem;color:rgba(255,255,255,.4);display:block;margin-top:.3rem}.modal-mutual{display:flex;align-items:center;gap:.5rem;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);margin:0 1.1rem .75rem;padding:.65rem;border-radius:10px}.modal-mutual span{font-size:1.1rem}.modal-mutual p{font-size:.75rem;color:#c084fc;margin:0;flex:1}.modal-sec{padding:0 1.1rem;margin-bottom:.75rem}.modal-sec h4{font-size:.6rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.35rem}.modal-sec p{font-size:.75rem;color:rgba(255,255,255,.6)}.modal-sec.contact{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);margin:0 1.1rem .75rem;padding:.75rem;border-radius:10px}.modal-sec.contact h4{color:#10b981}.modal-sec.contact a{display:block;font-size:.75rem;color:#3b82f6;margin-top:.3rem;text-decoration:none}.modal-bot{padding:.75rem 1.1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem;align-items:center}.modal-actions{display:flex;gap:.45rem;width:100%}.modal-actions .btn-main,.modal-actions .btn-ghost{flex:1}.connected-badge{color:#10b981;font-weight:600;font-size:.8rem}.pending-badge{color:rgba(255,255,255,.5);font-size:.8rem}.btn-report{background:none;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);padding:.35rem .75rem;border-radius:8px;font-size:.7rem;cursor:pointer;margin-top:.2rem}.modal select{width:calc(100% - 2.2rem);padding:.7rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;margin:.75rem 1.1rem}.modal h2{text-align:center;font-size:.95rem;padding-top:1.1rem}.admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin-bottom:.75rem}.stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.55rem;text-align:center}.stat b{font-size:1.1rem;display:block}.stat span{font-size:.55rem;color:rgba(255,255,255,.45)}.stat.warn{border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.08)}.tabs{display:flex;gap:.35rem;margin-bottom:.75rem}.tabs button{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.55);padding:.45rem;border-radius:8px;font-size:.7rem;cursor:pointer}.tabs button.on{background:#e63946;border-color:#e63946;color:#fff}.admin-list{display:flex;flex-direction:column;gap:.35rem}.admin-item{display:flex;align-items:center;gap:.55rem;padding:.65rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px}.admin-item.flagged{border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.05)}.admin-item .info{flex:1;min-width:0}.admin-item b{font-size:.8rem}.admin-item span{font-size:.6rem;color:rgba(255,255,255,.45);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-item .phone{color:#10b981}.acts{display:flex;gap:.25rem}.sm-btn{width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.7rem;display:flex;align-items:center;justify-content:center;border:none}.sm-btn.green{background:#10b981;color:#fff}.sm-btn.red{background:rgba(230,57,70,.15);color:#e63946}.empty{text-align:center;padding:1.25rem;color:rgba(255,255,255,.35);font-size:.75rem}.static{padding:.75rem}.static-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:1.1rem;margin-top:2.75rem;max-width:360px;margin-left:auto;margin-right:auto}.static-card h1{font-size:1rem;margin-bottom:.85rem}.static-card section{margin-bottom:.85rem}.static-card h3{font-size:.8rem;color:#e63946;margin-bottom:.25rem}.static-card p{font-size:.75rem;color:rgba(255,255,255,.55);line-height:1.4}.how{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin:1rem 0}.how div{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07);padding:.75rem .65rem;border-radius:10px;text-align:center;position:relative}.how b{position:absolute;top:-6px;left:-6px;width:20px;height:20px;background:#e63946;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6rem}.how h4{font-size:.75rem;margin-bottom:.15rem}.how p{font-size:.6rem;color:rgba(255,255,255,.45);margin:0}.toast{position:fixed;top:.75rem;left:.75rem;right:.75rem;background:#0d1117;border:1px solid #10b981;padding:.65rem .8rem;border-radius:10px;font-size:.75rem;z-index:300;animation:toast .2s ease}.toast.info{border-color:#f59e0b}@keyframes toast{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@media(min-width:768px){.hero h1{font-size:2.5rem}.features{grid-template-columns:repeat(4,1fr);max-width:650px;margin:0 auto 1.5rem}.auth-card{margin-top:3.5rem}.cards{display:grid;grid-template-columns:repeat(2,1fr)}.modal-bg{align-items:center;padding:.75rem}.modal{border-radius:18px;max-height:80vh}.tab-bar{position:static;background:transparent;border:none;justify-content:center;gap:.35rem;padding:.75rem}.tab-bar button{flex:none;flex-direction:row;padding:.45rem .8rem;border-radius:8px;font-size:.75rem;gap:.3rem}.tab-bar button span{font-size:.9rem}.tab-bar button.on{background:rgba(230,57,70,.12)}.tab-bar button b{position:static;transform:none;margin-left:.25rem}.app-page{padding-bottom:0}}.avatar-inline{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}.avatar-inline button{width:40px;height:40px;font-size:1.3rem;background:transparent;border:2px solid rgba(255,255,255,.1);border-radius:10px;cursor:pointer;transition:all .15s}.avatar-inline button:hover{border-color:rgba(255,255,255,.2)}.avatar-inline button.on{border-color:#e63946;background:rgba(230,57,70,.12);transform:scale(1.05)}.btn-qr{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);color:#c084fc;padding:.6rem;border-radius:10px;font-size:.8rem;cursor:pointer;margin-top:.75rem;width:100%}.btn-qr:active{opacity:.8}.qr-modal{max-height:75vh}.qr-content{padding:1.5rem;text-align:center}.qr-content h2{font-size:1.1rem;margin-bottom:.25rem;padding:0}.qr-content>p{font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:1rem}.qr-code{background:#fff;padding:1rem;border-radius:12px;display:inline-block;margin-bottom:1rem}.qr-svg{width:150px;height:150px}.qr-profile{display:flex;align-items:center;gap:.6rem;background:rgba(255,255,255,.05);padding:.75rem;border-radius:10px;margin-bottom:.75rem}.qr-profile b{font-size:.85rem;display:block}.qr-profile span{font-size:.7rem;color:rgba(255,255,255,.45)}.qr-hint{font-size:.65rem;color:rgba(255,255,255,.35);font-style:italic}.announcement-banner{display:flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,rgba(230,57,70,.15),rgba(245,158,11,.1));border:1px solid rgba(245,158,11,.3);padding:.65rem .75rem;border-radius:10px;margin-bottom:.75rem}.announcement-banner span{font-size:1.1rem}.announcement-banner p{font-size:.75rem;color:rgba(255,255,255,.8);margin:0;flex:1;line-height:1.35}.announce-section h4{font-size:.8rem;color:rgba(255,255,255,.5);margin:1rem 0 .5rem}.announce-form textarea{width:100%;padding:.65rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;font-size:.85rem;min-height:80px;resize:none;margin-bottom:.5rem}.announce-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.75rem;margin-bottom:.4rem}.announce-item p{font-size:.8rem;color:rgba(255,255,255,.75);margin:0 0 .4rem;line-height:1.4}.announce-meta{display:flex;justify-content:space-between;align-items:center}.announce-meta span{font-size:.6rem;color:rgba(255,255,255,.35)}.announce-meta button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:.75rem}.core-team-btn{display:flex;align-items:center;gap:.6rem;width:100%;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.08));border:1px solid rgba(245,158,11,.35);padding:.75rem;border-radius:12px;margin-bottom:.75rem;cursor:pointer;text-align:left}.core-team-btn>span:first-child{font-size:1.5rem}.core-team-btn div{flex:1}.core-team-btn b{font-size:.85rem;color:#fbbf24;display:block}.core-team-btn p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}.core-team-btn .arrow{font-size:1rem;color:rgba(255,255,255,.3)}.core-team-btn:active{opacity:.9}.dashboard h3{font-size:1rem;margin-bottom:.75rem;color:rgba(255,255,255,.8)}.dash-stats{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem}.dash-stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:.75rem;text-align:center}.dash-stat.big{background:linear-gradient(135deg,rgba(230,57,70,.1),rgba(230,57,70,.05))}.dash-stat .dash-icon{font-size:1.5rem;display:block;margin-bottom:.25rem}.dash-stat b{font-size:1.5rem;display:block;color:#fff}.dash-stat span{font-size:.65rem;color:rgba(255,255,255,.45)}.dash-section{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:.75rem;margin-bottom:.75rem}.dash-section h4{font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.dash-bars{display:flex;flex-direction:column;gap:.5rem}.dash-bar{display:flex;align-items:center;gap:.5rem}.bar-label{font-size:.7rem;color:rgba(255,255,255,.6);width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar-track{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}.bar-fill{height:100%;background:linear-gradient(90deg,#e63946,#ff6b6b);border-radius:4px;transition:width .3s}.bar-fill.college{background:linear-gradient(90deg,#3b82f6,#60a5fa)}.bar-count{font-size:.7rem;color:rgba(255,255,255,.5);width:24px;text-align:right}.activity-list{display:flex;flex-direction:column;gap:.4rem}.activity-item{display:flex;align-items:center;gap:.5rem;padding:.5rem;background:rgba(255,255,255,.03);border-radius:8px}.activity-item span{font-size:1rem}.activity-item p{font-size:.75rem;color:rgba(255,255,255,.6);margin:0}.report-section{display:flex;flex-direction:column;gap:.75rem}.report-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1rem;text-align:center}.report-card>span{font-size:2rem;display:block;margin-bottom:.5rem}.report-card h4{font-size:.9rem;margin-bottom:.35rem}.report-card p{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:.75rem}.report-preview{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1rem}.report-preview h4{font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.preview-stats{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.preview-stats div{background:rgba(255,255,255,.05);padding:.5rem;border-radius:8px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.6)}.preview-stats b{display:block;font-size:1rem;color:#e63946;margin-bottom:.15rem}.phone-input{display:flex;align-items:center;background:rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;margin-top:.3rem;overflow:hidden}.phone-input:focus-within{border-color:#e63946}.phone-prefix{padding:.75rem;background:rgba(255,255,255,.05);color:rgba(255,255,255,.6);font-weight:600;font-size:.9rem;border-right:1px solid rgba(255,255,255,.1)}.phone-input input{flex:1;padding:.75rem;background:transparent;border:none;color:#fff;margin:0}.phone-input input:disabled{opacity:.5}.phone-input input.verified{background:rgba(16,185,129,.08)}.leaderboard-section{padding-bottom:1rem}.leaderboard-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}.leaderboard-header span{font-size:2.5rem}.leaderboard-header h2{font-size:1.1rem;margin:0}.leaderboard-header p{font-size:.7rem;color:rgba(255,255,255,.5);margin:0}.leaderboard-list{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1rem}.leaderboard-item{display:flex;align-items:center;gap:.5rem;padding:.65rem .75rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;cursor:pointer}.leaderboard-item.top3{background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(245,158,11,.04));border-color:rgba(251,191,36,.2)}.leaderboard-item.is-me{background:rgba(230,57,70,.08);border-color:rgba(230,57,70,.25)}.leaderboard-item .rank{font-size:1.1rem;width:28px;text-align:center}.leaderboard-item .info{flex:1;min-width:0}.leaderboard-item b{font-size:.8rem;display:flex;align-items:center;gap:.35rem}.leaderboard-item span{font-size:.65rem;color:rgba(255,255,255,.45)}.you-badge{background:#e63946;color:#fff;font-size:.5rem;padding:.1rem .35rem;border-radius:50px;font-weight:600}.conn-score{text-align:right}.conn-score b{font-size:1rem;color:#fbbf24;display:block}.conn-score span{font-size:.55rem;color:rgba(255,255,255,.4)}.your-rank{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.75rem;text-align:center;margin-bottom:1rem}.your-rank p{font-size:.85rem;margin:0 0 .2rem;color:rgba(255,255,255,.7)}.your-rank span{font-size:.7rem;color:rgba(255,255,255,.45)}.leaderboard-badges h3{font-size:.85rem;color:rgba(255,255,255,.6);margin-bottom:.6rem}.badges-grid{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}.badge-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.6rem;text-align:center}.badge-item span{font-size:1.5rem;display:block;margin-bottom:.25rem}.badge-item b{font-size:.7rem;display:block;margin-bottom:.15rem}.badge-item p{font-size:.6rem;color:rgba(255,255,255,.4);margin:0}.load-more-btn{width:100%;padding:.75rem;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.15);border-radius:12px;color:rgba(255,255,255,.6);font-size:.8rem;cursor:pointer;margin-top:.5rem}.load-more-btn:active{background:rgba(255,255,255,.08)}.results-count{font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:.5rem}.search-loading{font-size:.7rem;color:#fbbf24;margin-bottom:.5rem;animation:pulse 1s infinite}.fb-events{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin-top:.3rem}.fb-events button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.5rem;border-radius:8px;font-size:.75rem;cursor:pointer;text-align:center}.fb-events button.on{background:rgba(230,57,70,.15);border-color:#e63946;color:#ff6b6b}.fb-event-tag{background:#e63946;color:#fff;font-size:.6rem;padding:.15rem .4rem;border-radius:50px;font-weight:600}.fb-ratings{display:flex;gap:.5rem;margin:.5rem 0}.fb-rating-item{flex:1;background:rgba(255,255,255,.05);padding:.4rem;border-radius:6px;text-align:center}.fb-rating-item span{font-size:.55rem;color:rgba(255,255,255,.5);display:block}.fb-rating-item b{font-size:.7rem;color:#fbbf24}.fb-events{display:flex;flex-direction:column;gap:.4rem;margin-top:.3rem}.fb-events button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);padding:.6rem;border-radius:10px;cursor:pointer;text-align:left}.fb-events button b{display:block;font-size:.8rem;color:#fff;margin-bottom:.15rem}.fb-events button span{font-size:.65rem;color:rgba(255,255,255,.45)}.fb-events button.on{background:rgba(230,57,70,.12);border-color:#e63946}.fb-events button.on b{color:#ff6b6b}.fb-divider{display:flex;align-items:center;gap:.5rem;margin:.75rem 0 .5rem}.fb-divider::before,.fb-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}.fb-divider span{font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.03em}.fb-specific{display:flex;flex-direction:column;gap:.35rem;margin:.5rem 0;padding:.5rem;background:rgba(255,255,255,.03);border-radius:8px}.fb-q{display:flex;justify-content:space-between;align-items:center;padding:.3rem 0}.fb-q span{font-size:.65rem;color:rgba(255,255,255,.5);flex:1}.fb-q b{font-size:.7rem;color:#fbbf24}.feedback-section{display:flex;flex-direction:column;gap:.5rem}.feedback-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}.feedback-header h3{font-size:.9rem;margin:0;color:rgba(255,255,255,.7)}`;

  return (<><style>{css}</style><Toast />{view === 'landing' && <Landing />}{view === 'signup' && <Signup />}{view === 'login' && <Login />}{view === 'adminLogin' && <AdminLogin />}{view === 'admin' && isAdmin && <Admin />}{view === 'app' && <App />}{view === 'privacy' && <Privacy />}{view === 'terms' && <Terms />}{view === 'about' && <About />}</>);
};

export default StrategiaConnect;
