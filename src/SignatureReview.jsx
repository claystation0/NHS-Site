import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './styles/signatures.css';

const SignatureReview = ({ profile }) => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trimesterFilter, setTrimesterFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [isTrimesterDropdownOpen, setIsTrimesterDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchSignatures();

      const subscription = supabase
        .channel('service_hours_signatures')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'service_hours' },
          () => fetchSignatures()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAdmin]);

  const fetchSignatures = async () => {
    setLoading(true);

    const { data: hoursData, error: hoursError } = await supabase
      .from('service_hours')
      .select('*')
      .not('signature', 'is', null)
      .eq('status', 'completed')
      .order('date', { ascending: false });

    if (hoursError) {
      console.error('Error fetching signatures:', hoursError);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(hoursData.map(record => record.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, grade')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    const profilesMap = {};
    (profilesData || []).forEach(p => {
      profilesMap[p.id] = { first_name: p.first_name, last_name: p.last_name, grade: p.grade };
    });

    const processedSignatures = hoursData.map(record => ({
      ...record,
      student_first_name: profilesMap[record.user_id]?.first_name || 'Unknown',
      student_last_name: profilesMap[record.user_id]?.last_name || '',
      student_grade: profilesMap[record.user_id]?.grade
    }));

    setSignatures(processedSignatures);
    setLoading(false);
  };

  const handleDeleteSignature = async (signatureId) => {
    if (!window.confirm('Are you sure you want to delete this service hour entry? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('service_hours')
      .delete()
      .eq('id', signatureId);

    if (error) {
      console.error('Error deleting signature:', error);
      alert('Failed to delete service hour entry');
    } else {
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(signatureId);
        return newSet;
      });
      fetchSignatures();
    }
  };

  const toggleCard = (id) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const getFilteredSignatures = () => {
    return signatures.filter(sig => {
      const fullName = `${sig.student_first_name} ${sig.student_last_name}`.toLowerCase();
      const supervisorName = (sig.supervisor_name || '').toLowerCase();
      const nameMatch = fullName.includes(searchTerm.toLowerCase()) || supervisorName.includes(searchTerm.toLowerCase());
      
      if (!nameMatch) return false;
      
      if (trimesterFilter !== 'all' && sig.trimester !== parseInt(trimesterFilter)) {
        return false;
      }
      
      if (categoryFilter !== 'all' && sig.category !== categoryFilter) {
        return false;
      }

      if (gradeFilter !== 'all' && sig.student_grade !== parseInt(gradeFilter)) {
        return false;
      }
      
      return true;
    });
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'in_school': 'In-School',
      'out_school': 'Out-of-School',
      'red_hook': 'Red Hook'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'in_school': '#d4a574',
      'out_school': '#8b6f47',
      'red_hook': '#4a5568'
    };
    return colors[category] || '#718096';
  };

  // Get unique grades from signatures
  const getUniqueGrades = () => {
    const grades = [...new Set(signatures.map(s => s.student_grade).filter(g => g != null))].sort((a, b) => a - b);
    return grades;
  };

  if (!isAdmin) {
    return (
      <div className="signature-review-error">
        You do not have permission to review signatures.
      </div>
    );
  }

  if (loading) {
    return <div className="signature-review-loading">Loading signatures...</div>;
  }

  const filteredSignatures = getFilteredSignatures();
  const uniqueGrades = getUniqueGrades();

  return (
    <div className="signature-review-container">
      <div className="signature-review-header">
        <h2>Signature Review</h2>
        <p className="signature-count">
          {filteredSignatures.length} signature{filteredSignatures.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="signature-review-controls">
        <input
          type="text"
          placeholder="Search by student or supervisor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="multi-select-container">
          <button 
            className="multi-select-button"
            onClick={() => setIsTrimesterDropdownOpen(!isTrimesterDropdownOpen)}
          >
            {trimesterFilter === 'all' ? 'All Trimesters' : `Trimester ${trimesterFilter}`}
            <span className="dropdown-arrow">{isTrimesterDropdownOpen ? '▲' : '▼'}</span>
          </button>
          {isTrimesterDropdownOpen && (
            <div className="multi-select-dropdown">
              <div 
                className={`multi-select-option ${trimesterFilter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  setTrimesterFilter('all');
                  setIsTrimesterDropdownOpen(false);
                }}
              >
                <span>All Trimesters</span>
              </div>
              {[1, 2, 3].map(trim => (
                <div
                  key={trim}
                  className={`multi-select-option ${trimesterFilter === String(trim) ? 'selected' : ''}`}
                  onClick={() => {
                    setTrimesterFilter(String(trim));
                    setIsTrimesterDropdownOpen(false);
                  }}
                >
                  <span>Trimester {trim}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="multi-select-container">
          <button 
            className="multi-select-button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          >
            {categoryFilter === 'all' ? 'All Categories' : getCategoryLabel(categoryFilter)}
            <span className="dropdown-arrow">{isCategoryDropdownOpen ? '▲' : '▼'}</span>
          </button>
          {isCategoryDropdownOpen && (
            <div className="multi-select-dropdown">
              <div 
                className={`multi-select-option ${categoryFilter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  setCategoryFilter('all');
                  setIsCategoryDropdownOpen(false);
                }}
              >
                <span>All Categories</span>
              </div>
              {['in_school', 'out_school', 'red_hook'].map(cat => (
                <div
                  key={cat}
                  className={`multi-select-option ${categoryFilter === cat ? 'selected' : ''}`}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>{getCategoryLabel(cat)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="multi-select-container">
          <button 
            className="multi-select-button"
            onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
          >
            {gradeFilter === 'all' ? 'All Grades' : `Grade ${gradeFilter}`}
            <span className="dropdown-arrow">{isGradeDropdownOpen ? '▲' : '▼'}</span>
          </button>
          {isGradeDropdownOpen && (
            <div className="multi-select-dropdown">
              <div 
                className={`multi-select-option ${gradeFilter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  setGradeFilter('all');
                  setIsGradeDropdownOpen(false);
                }}
              >
                <span>All Grades</span>
              </div>
              {uniqueGrades.map(grade => (
                <div
                  key={grade}
                  className={`multi-select-option ${gradeFilter === String(grade) ? 'selected' : ''}`}
                  onClick={() => {
                    setGradeFilter(String(grade));
                    setIsGradeDropdownOpen(false);
                  }}
                >
                  <span>Grade {grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="signatures-grid">
        {filteredSignatures.length === 0 ? (
          <div className="no-signatures">No signatures found</div>
        ) : (
          filteredSignatures.map(sig => {
            const isExpanded = expandedCards.has(sig.id);
            return (
              <div key={sig.id} className="signature-card">
                <div className="signature-card-main" onClick={() => toggleCard(sig.id)}>
                  <div className="signature-card-header">
                    <div className="student-info">
                      <h3>{sig.supervisor_name || 'No Supervisor'}</h3>
                      <span className="trimester-badge">Trimester {sig.trimester}</span>
                    </div>
                    <button className="expand-btn">
                      {isExpanded ? '−' : '+'}
                    </button>
                  </div>

                  {sig.signature && (
                    <div className="signature-image-container">
                      <img 
                        src={sig.signature} 
                        alt="Supervisor signature" 
                        className="signature-image"
                      />
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="signature-details-expanded">
                    <div 
                      className="category-badge"
                      style={{ backgroundColor: getCategoryColor(sig.category) }}
                    >
                      {getCategoryLabel(sig.category)}
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Student:</span>
                      <span className="detail-value">{sig.student_first_name} {sig.student_last_name}</span>
                    </div>
                    {sig.student_grade && (
                      <div className="detail-row">
                        <span className="detail-label">Grade:</span>
                        <span className="detail-value">{sig.student_grade}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">
                        {new Date(sig.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Hour(s):</span>
                      <span className="detail-value">{sig.hours}</span>
                    </div>
                    {sig.description && (
                      <div className="detail-row">
                        <span className="detail-label">Description:</span>
                        <span className="detail-value">{sig.description}</span>
                      </div>
                    )}
                    <div className="detail-row" style={{ borderBottom: 'none', paddingTop: '1rem' }}>
                      <button 
                        className="btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSignature(sig.id);
                        }}
                        style={{ width: '100%' }}
                      >
                        Delete Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SignatureReview;