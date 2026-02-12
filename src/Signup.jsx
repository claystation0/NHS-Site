import { useState } from 'react';
import { supabase } from './supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import './styles/auth.css';

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    const gradeNum = grade ? parseInt(grade) : null;
    if (gradeNum !== null && (gradeNum < 10 || gradeNum > 12)) {
      alert('Grade must be between 10 and 12');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          grade: gradeNum,
        },
        emailRedirectTo: `${window.location.origin}/login`, // Redirect after email verification
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      // Show success message instead of navigating
      setEmailSent(true);
      setLoading(false);
    }
  };

  // If email verification was sent, show confirmation message
  if (emailSent) {
    return (
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
            }}>Verify Your Email</h1>
          </div>

          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{
              background: '#E8F5E9',
              border: '2px solid #4CAF50',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <p style={{
                fontSize: '1.125rem',
                color: '#2E7D32',
                margin: '0 0 0.5rem 0',
                fontWeight: 600
              }}>
                ✓ Account created successfully!
              </p>
              <p style={{
                fontSize: '0.95rem',
                color: '#1B5E20',
                margin: 0
              }}>
                We've sent a verification email to:
              </p>
              <p style={{
                fontSize: '1rem',
                color: '#000',
                margin: '0.5rem 0 0 0',
                fontWeight: 600
              }}>
                {email}
              </p>
            </div>

            <div style={{
              background: '#FFF3E0',
              border: '2px solid #FF9800',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <ol style={{
                fontSize: '0.95rem',
                color: '#333',
                margin: 0,
                paddingLeft: '1.5rem'
              }}>
                Check your inbox for a verification email from Supabase Auth. You may need to check your Spam folder.
              </ol>
            </div>

            <Link to="/login">
              <button
                className="auth-button"
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
              >
                Go to Sign In
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
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

        <div style={{ padding: '2.5rem' }}>
          <p style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            color: '#333',
            marginBottom: '2rem',
            fontWeight: 500
          }}>Create your account</p>

          <form onSubmit={handleSignUp}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#000',
                  fontSize: '0.95rem'
                }}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="auth-input"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s',
                    background: '#FAF9F6',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                  color: '#000',
                  fontSize: '0.95rem'
                }}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="auth-input"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s',
                    background: '#FAF9F6',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#000',
                fontSize: '0.95rem'
              }}>Grade (Optional)</label>
              <input
                type="number"
                min="10"
                max="12"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="auth-input"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s',
                  background: '#FAF9F6',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#000',
                fontSize: '0.95rem'
              }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s',
                  background: '#FAF9F6',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#000',
                fontSize: '0.95rem'
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s',
                  background: '#FAF9F6',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#000',
                fontSize: '0.95rem'
              }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="auth-input"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s',
                  background: '#FAF9F6',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-button"
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#999' : 'linear-gradient(135deg, #c93030 0%, #8b1e1e 100%)',
                color: 'white',
                border: '3px solid #000',
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
                fontFamily: 'inherit'
              }}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              color: '#666',
              fontSize: '0.95rem'
            }}>
              Already have an account?{' '}
              <Link to="/login" style={{
                color: '#c93030',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '2px solid #c93030'
              }}>Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
