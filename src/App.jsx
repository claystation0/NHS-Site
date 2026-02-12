import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Signup from './Signup';
import Settings from './Settings';
import logo from './assets/logo.png';
import Calendar from "./Calendar";
import Posts from './Posts';
import UserManagement from './UserManagement';
import SignatureReview from './SignatureReview';
import MemberCatalogue from './MemberCatalogue';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Routes, Route, Navigate } from 'react-router-dom';
import Volunteer from './Volunteer';
import Sidebar, { MobileSidebarProvider, MobileNavToggle } from './Sidebar';
import './App.css';

const PendingApprovalScreen = ({ profile, onSignOut }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FAF9F6 0%, #E9DCC9 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  }}>
    <div style={{
      background: 'white',
      borderRadius: '24px',
      border: '3px solid #000',
      boxShadow: '8px 8px 0px rgba(0,0,0,0.1)',
      maxWidth: '560px',
      width: '100%',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #c93030 0%, #8b1e1e 100%)',
        padding: '3rem 2rem',
        textAlign: 'center',
        borderBottom: '3px solid #000'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2rem',
          fontWeight: 700,
          margin: '0 0 0.5rem 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>National Honor Society</h1>
        <h2 style={{
          color: '#FAF9F6',
          fontSize: '1.25rem',
          fontWeight: 500,
          margin: 0
        }}>BASIS Independent Brooklyn</h2>
      </div>
      <div style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          background: '#fee2e2',
          border: '2px solid #c93030',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.25rem',
            color: '#92400e',
            fontWeight: 700
          }}>Pending Approval</h3>
          <p style={{
            margin: 0,
            fontSize: '1rem',
            color: '#92400e',
            lineHeight: 1.6
          }}>
            Welcome, <strong>{profile?.first_name}</strong>! Your account is awaiting approval from an administrator.
          </p>
        </div>
        <div style={{
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '1rem'
          }}>What happens next?</h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: '#F6F4EE',
              borderRadius: '8px',
              fontSize: '0.95rem',
              color: '#374151'
            }}>
              ✓ An NHS administrator will review your account
            </li>
            <li style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: '#F6F4EE',
              borderRadius: '8px',
              fontSize: '0.95rem',
              color: '#374151'
            }}>
              ✓ You'll receive access once approved
            </li>
            <li style={{
              padding: '0.75rem',
              background: '#F6F4EE',
              borderRadius: '8px',
              fontSize: '0.95rem',
              color: '#374151'
            }}>
              ✓ Check back soon or refresh this page
            </li>
          </ul>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #c93030 0%, #8b1e1e 100%)',
            color: 'white',
            border: '3px solid #000',
            borderRadius: '12px',
            fontSize: '1.125rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
            fontFamily: 'inherit'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.1)';
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
);

const MemberDashboard = ({ profile, onSignOut }) => (
  <>
    <nav className="header">
      <div className="nav_left">
        <img id="nav_logo" src={logo} alt="BIB NHS"/>
      </div>
      <div className="nav_right">
        <MobileNavToggle />
      </div>
    </nav>
    <div id="menu_dashboard">
      <Sidebar role={profile?.role} onSignOut={onSignOut} />
      <div id="dashboard">
        <div id="left_dashboard">
          <Posts profile={profile} />
        </div>
        <div id="right_dashboard">
            <h1>Upcoming Events</h1>
            <Calendar />
        </div>
      </div>
    </div>
  </>
);

const LeaderDashboard = ({ profile, onSignOut }) => (
  <>
    <nav className="header">
      <div className="nav_left">
        <img id="nav_logo" src={logo} alt="BIB NHS"/>
      </div>
      <div className="nav_right">
        <MobileNavToggle />
      </div>
    </nav>
    <div id="menu_dashboard">
      <Sidebar role={profile?.role} onSignOut={onSignOut} />
      <div id="dashboard">
        <div id="left_dashboard">
          <Posts profile={profile} />
        </div>
        <div id="right_dashboard">
            <h1>Upcoming Events</h1>
            <Calendar />
        </div>
      </div>
    </div>
  </>
);

const AdminDashboard = ({ profile, onSignOut }) => (
  <>
    <nav className="header">
      <div className="nav_left">
        <img id="nav_logo" src={logo} alt="BIB NHS"/>
      </div>
      <div className="nav_right">
        <MobileNavToggle />
      </div>
    </nav>
    <div id="menu_dashboard">
      <Sidebar role={profile?.role} onSignOut={onSignOut} />
      <div id="dashboard">
        <div id="left_dashboard">
          <Posts profile={profile} />
        </div>
        <div id="right_dashboard">
          <h1>Upcoming Events</h1>
          <Calendar />
        </div>
      </div>
    </div>
  </>
);

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      session ? loadProfile(session.user.id) : setLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        session ? loadProfile(session.user.id) : setProfile(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 968; // same breakpoint as your CSS
      if (isLargeScreen && location.pathname === '/calendar') {
        navigate('/dashboard', { replace: true });
      }
    };

    handleResize();

    // listen to resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname, navigate]);

  // Handle unauthorized/non-existent routes - only on initial load, not on navigation
  useEffect(() => {
    const publicPaths = ['/login', '/signup', '/'];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (!loading && !session && !isPublicPath) {
      navigate('/login', { replace: true });
    } else if (!loading && session && profile) {
      // Check if user is not approved - redirect to pending page
      if (!profile.approved && location.pathname !== '/pending') {
        navigate('/pending', { replace: true });
      }
    }
  }, [loading, session, profile]);

  const loadProfile = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, grade, role, approved')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontSize:'18px'}}>Loading...</div>;

  return (
    <MobileSidebarProvider>
      <Routes>
        <Route 
          path="/login" 
          element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/signup"
          element={session ? <Navigate to="/dashboard" replace /> : <Signup />}
        />
        <Route
          path="/pending"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile ? <div><h2>Profile Not Found</h2><button onClick={handleSignOut}>Sign Out</button></div> :
            profile.approved ? <Navigate to="/dashboard" replace /> :
            <PendingApprovalScreen profile={profile} onSignOut={handleSignOut} />
          }
        />
        <Route 
          path="/volunteer" 
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <Volunteer session={session} />
              </div>
            </>
          } 
        />
        <Route 
          path="/calendar"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <div style={{flex:1,padding:'2rem'}}>
                  <Calendar />
                </div>
              </div>
            </>
          }
        />
        <Route 
          path="/members"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            (profile?.role !== 'admin' && profile?.role !== 'leader') ? <Navigate to="/dashboard" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <div style={{flex:1,padding:'2rem'}}>
                  <MemberCatalogue profile={profile} />
                </div>
              </div>
            </>
          }
        />
        <Route 
          path="/signatures"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            profile?.role !== 'admin' ? <Navigate to="/dashboard" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <div style={{flex:1,padding:'2rem'}}>
                  <SignatureReview profile={profile} />
                </div>
              </div>
            </>
          }
        />
        <Route 
          path="/users"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            profile?.role !== 'admin' ? <Navigate to="/dashboard" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <div style={{flex:1,padding:'2rem'}}>
                  <UserManagement profile={profile} />
                </div>
              </div>
            </>
          }
        />
        <Route 
          path="/settings"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile?.approved ? <Navigate to="/pending" replace /> :
            <>
              <nav className="header">
                <div className="nav_left">
                  <img id="nav_logo" src={logo} alt="BIB NHS"/>
                </div>
                <div className="nav_right">
                  
                  <MobileNavToggle />
                </div>
              </nav>
              <div id="menu_dashboard">
                <Sidebar role={profile?.role} onSignOut={handleSignOut} />
                <Settings profile={profile} onSignOut={handleSignOut} />
              </div>
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            !session ? <Navigate to="/login" replace /> :
            !profile ? <div><h2>Profile Not Found</h2><button onClick={handleSignOut}>Sign Out</button></div> :
            !profile.approved ? <Navigate to="/pending" replace /> :
            profile.role === 'admin' ? <AdminDashboard profile={profile} onSignOut={handleSignOut} /> :
            profile.role === 'leader' ? <LeaderDashboard profile={profile} onSignOut={handleSignOut} /> :
            <MemberDashboard profile={profile} onSignOut={handleSignOut} />
          }
        />
        <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </MobileSidebarProvider>
  );
}

export default App;