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
      .order('created_at', { ascending: false }); // Changed order to created_at since 'date' might be an array now

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

    // Flatten multi-date entries into separate cards
    const processedSignatures = [];
    hoursData.forEach(record => {
      const baseData = {
        ...record,
        student_first_name: profilesMap[record.user_id]?.first_name || 'Unknown',
        student_last_name: profilesMap[record.user_id]?.last_name || '',
        student_grade: profilesMap[record.user_id]?.grade
      };

      if (record.dates && record.dates.length > 0) {
        record.dates.forEach(dateStr => {
          processedSignatures.push({
            ...baseData,
            displayDate: dateStr,
            displayId: `${record.id}-${dateStr}` // Unique ID for React keys and expanded state
          });
        });
      } else {
        processedSignatures.push({
          ...baseData,
          displayDate: record.date,
          displayId: record.id
        });
      }
    });

    setSignatures(processedSignatures);
    setLoading(false);
  };

const handleDeleteSignature = async (e, recordId, displayDate) => {
    // Prevent the card from toggling open/closed when clicking the trash can
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    // 1. Find the original record from our local signatures state
    const record = signatures.find(s => s.id === recordId);

    // 2. Check if it's a multi-date entry
    if (record?.dates && record.dates.length > 1) {
      // SMART DELETE: Filter out only the date associated with this card
      const updatedDates = record.dates.filter(d => d !== displayDate);

      const { error } = await supabase
        .from('service_hours')
        .update({ dates: updatedDates })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating record dates:', error);
        alert('Failed to remove the date from this entry.');
      } else {
        fetchSignatures(); // Refresh the grid
      }
    } else {
      // STANDARD DELETE: Only one date exists, so delete the whole row
      const { error } = await supabase
        .from('service_hours')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete the service hour entry.');
      } else {
        // Clear expanded state for this specific card
        setExpandedCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${recordId}-${displayDate}`);
          newSet.delete(recordId);
          return newSet;
        });
        fetchSignatures();
      }
    }
  };

  const toggleCard = (displayId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(displayId)) {
      newExpanded.delete(displayId);
    } else {
      newExpanded.add(displayId);
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
      {/* ... (Keep your existing header and filter controls exactly as they were) ... */}
      <div className="signature-review-header">
        <h2>Signature Review</h2>
        <p className="signature-count">
          {filteredSignatures.length} signature{filteredSignatures.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="signature-review-controls">
        {/* Your existing search and filter dropdowns go here */}
      </div>

      <div className="signatures-grid">
        {filteredSignatures.length === 0 ? (
          <div className="no-signatures">No signatures found</div>
        ) : (
          filteredSignatures.map(sig => {
            const isExpanded = expandedCards.has(sig.displayId);
            return (
              <div key={sig.displayId} className="signature-card">
                <div className="signature-card-main" onClick={() => toggleCard(sig.displayId)}>
                  <div className="signature-card-header">
                    <div className="student-info">
                      <h3>{sig.supervisor_name || 'No Supervisor'}</h3>
                      <span className="trimester-badge">Trimester {sig.trimester}</span>
                    </div>
                    
                    {/* Actions container for Trash + Expand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        className="delete-icon-btn"
                        onClick={(e) => handleDeleteSignature(e, sig.id, sig.displayDate)}
                        title="Delete Entry"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#c93030'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                      <button className="expand-btn">
                        {isExpanded ? '−' : '+'}
                      </button>
                    </div>
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
                        {sig.displayDate ? new Date(sig.displayDate + 'T00:00:00').toLocaleDateString() : 'N/A'}
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
