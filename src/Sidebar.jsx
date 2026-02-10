import { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import home from './assets/home.svg';
import volunteer from './assets/volunteer.svg';
import management from './assets/management.svg';
import ledger from './assets/ledger.svg';
import settings from './assets/settings.svg';
import signatures from './assets/signatures.svg';
import calendar from './assets/calendar.svg';

// Create context for mobile sidebar state
const MobileSidebarContext = createContext();

export const useMobileSidebar = () => {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    return { isMobileOpen: false, setIsMobileOpen: () => {}, isMobile: false };
  }
  return context;
};

export function MobileSidebarProvider({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    let timeoutId;
    
    const checkMobile = () => {
      // Debounce to prevent rapid state changes
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(prevMobile => {
          if (prevMobile !== mobile) {
            if (!mobile) {
              setIsMobileOpen(false);
            }
            return mobile;
          }
          return prevMobile;
        });
      }, 100);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
  }, []);

  // Close sidebar when clicking outside or pressing ESC
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isMobileOpen]);

  const contextValue = {
    isMobileOpen,
    setIsMobileOpen,
    isMobile
  };

  return (
    <MobileSidebarContext.Provider value={contextValue}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

function Sidebar({ role, onSignOut }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { isMobileOpen, setIsMobileOpen, isMobile } = useMobileSidebar();
  
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Handle window resize and auto-collapse on medium screens
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      
      // Auto-collapse on medium screens (between 768 and 1200)
      if (width > 768 && width <= 1200) {
        setIsCollapsed(true);
        localStorage.setItem('sidebarCollapsed', 'true');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save collapsed state only on desktop
  useEffect(() => {
    if (windowWidth > 1200) {
      localStorage.setItem('sidebarCollapsed', isCollapsed);
    }
  }, [isCollapsed, windowWidth]);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleToggle = () => {
    if (windowWidth > 1200) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Determine if we should show collapsed state
  const shouldBeCollapsed = windowWidth > 768 && windowWidth <= 1200 ? true : isCollapsed;

  return (
    <>
      {isMobile && isMobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMobileOpen(false);
          }}
        />
      )}
      
      <div className={`sidebar ${shouldBeCollapsed ? 'collapsed' : ''} ${isMobile && isMobileOpen ? 'mobile-open' : ''} ${isMobile && !isMobileOpen ? 'mobile-closed' : ''}`}>
        {isMobile && (
          <div className="sidebar-mobile-header">
            <button 
              className="sidebar-mobile-close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMobileOpen(false);
              }}
              aria-label="Close menu"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {!isMobile && windowWidth > 1200 && (
          <button 
            type="button"
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label={shouldBeCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {shouldBeCollapsed ? '▶' : '◀'}
          </button>
        )}
        
        <nav className="sidebar-nav">
          <Link 
            to="/dashboard" 
            className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
            title="Dashboard"
            onClick={handleLinkClick}
          >
            <span><img src={home} alt="" /></span>
            {(!shouldBeCollapsed || isMobile) && <span className="link-text">Dashboard</span>}
          </Link>
          
          {role !== 'admin' && (
            <Link 
              to="/volunteer" 
              className={`sidebar-link ${isActive('/volunteer') ? 'active' : ''}`}
              title="My Hours"
              onClick={handleLinkClick}
            >
              <span><img src={volunteer} alt="" /></span>
              {(!shouldBeCollapsed || isMobile) && <span className="link-text">My Hours</span>}
            </Link>
          )}
          
          {(role === 'leader' || role === 'admin') && (
            <Link 
              to="/members" 
              className={`sidebar-link ${isActive('/members') ? 'active' : ''}`}
              title="Members"
              onClick={handleLinkClick}
            >
              <span><img src={ledger} alt="" /></span>
              {(!shouldBeCollapsed || isMobile) && <span className="link-text">Catalogue</span>}
            </Link>
          )}
          
          {role === 'admin' && (
            <>
              <Link 
                to="/signatures" 
                className={`sidebar-link ${isActive('/signatures') ? 'active' : ''}`}
                title="Signatures"
                onClick={handleLinkClick}
              >
                <span><img src={signatures} alt="" /></span>
                {(!shouldBeCollapsed || isMobile) && <span className="link-text">Signatures</span>}
              </Link>
              <Link 
                to="/users" 
                className={`sidebar-link ${isActive('/users') ? 'active' : ''}`}
                title="Manage Users"
                onClick={handleLinkClick}
              >
                <span><img src={management} alt="" /></span>
                {(!shouldBeCollapsed || isMobile) && <span className="link-text">Users</span>}
              </Link>
            </>
          )}

          {isMobile && (
            <Link 
              to="/calendar" 
              className={`sidebar-link ${isActive('/calendar') ? 'active' : ''}`}
              title="Calendar"
              onClick={handleLinkClick}
            >
              <span><img src={calendar} alt="" /></span>
              <span className="link-text">Calendar</span>
            </Link>
          )}
          
          <Link 
            to="/settings" 
            className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
            title="Settings"
            onClick={handleLinkClick}
          >
            <span><img src={settings} alt="" /></span>
            {(!shouldBeCollapsed || isMobile) && <span className="link-text">Settings</span>}
          </Link>
        </nav>
      </div>
    </>
  );
}

export function MobileNavToggle() {
  const { isMobileOpen, setIsMobileOpen, isMobile } = useMobileSidebar();
  
  if (!isMobile) return null;
  
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMobileOpen(prev => !prev);
  };
  
  return (
    <button 
      className="mobile-nav-toggle"
      onClick={handleToggle}
      aria-label="Toggle menu"
      type="button"
    >
      {isMobileOpen ? '✕' : '☰'}
    </button>
  );
}

export default Sidebar;