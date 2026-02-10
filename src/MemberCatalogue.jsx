import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './styles/ledger.css';

const MemberCatalogue = ({ profile }) => {
  const [members, setMembers] = useState([]);
  const [volunteerData, setVolunteerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrimesters, setSelectedTrimesters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minHours, setMinHours] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState([10, 11, 12]);
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false);

  const canViewHours = profile?.role === 'admin' || profile?.role === 'leader';

  const getDefaultTrimesters = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    if (month >= 9 && month <= 12) {
      return [1];
    } else if (month >= 1 && month <= 2) {
      return [1, 2];
    } else if (month >= 3 && month <= 8) {
      return [1, 2, 3];
    }
    return [1];
  };

  useEffect(() => {
    setSelectedTrimesters(getDefaultTrimesters());
  }, []);

  useEffect(() => {
    if (canViewHours) {
      fetchData();

      const subscription = supabase
        .channel('volunteer_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'service_hours' },
          () => fetchData()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [canViewHours]);

  const fetchData = async () => {
    setLoading(true);

    const { data: membersData, error: membersError } = await supabase
      .rpc('get_member_emails');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      setLoading(false);
      return;
    }

    const { data: volunteerRecords, error: volunteerError } = await supabase
      .from('service_hours')
      .select('*')
      .eq('status', 'completed');

    if (volunteerError) {
      console.error('Error fetching volunteer data:', volunteerError);
    }

    setMembers(membersData || []);
    setVolunteerData(volunteerRecords || []);
    setLoading(false);
  };

  const calculateMemberHours = (memberId) => {
    const memberRecords = volunteerData.filter(record => record.user_id === memberId);
    
    const hours = {
      total: { inSchool: 0, outSchool: 0, redHook: 0, overall: 0 },
      trimester1: { inSchool: 0, outSchool: 0, redHook: 0, overall: 0 },
      trimester2: { inSchool: 0, outSchool: 0, redHook: 0, overall: 0 },
      trimester3: { inSchool: 0, outSchool: 0, redHook: 0, overall: 0 }
    };

    memberRecords.forEach(record => {
      const trimester = record.trimester;
      const hoursValue = parseFloat(record.hours) || 0;
      const category = record.category;

      if (category === 'in_school') hours.total.inSchool += hoursValue;
      else if (category === 'out_school') hours.total.outSchool += hoursValue;
      else if (category === 'red_hook') hours.total.redHook += hoursValue;
      hours.total.overall += hoursValue;

      if (trimester >= 1 && trimester <= 3) {
        const trimKey = `trimester${trimester}`;
        if (category === 'in_school') hours[trimKey].inSchool += hoursValue;
        else if (category === 'out_school') hours[trimKey].outSchool += hoursValue;
        else if (category === 'red_hook') hours[trimKey].redHook += hoursValue;
        hours[trimKey].overall += hoursValue;
      }
    });

    return hours;
  };

  const getSelectedHours = (memberHours) => {
    const selected = {
      inSchool: 0,
      outSchool: 0,
      redHook: 0,
      overall: 0
    };

    selectedTrimesters.forEach(trimNum => {
      const trimKey = `trimester${trimNum}`;
      selected.inSchool += memberHours[trimKey].inSchool;
      selected.outSchool += memberHours[trimKey].outSchool;
      selected.redHook += memberHours[trimKey].redHook;
      selected.overall += memberHours[trimKey].overall;
    });

    return selected;
  };

  const getHourColor = (value, category) => {
    const multiplier = selectedTrimesters.length;
    
    if (category === 'inSchool') {
      const threshold = 5 * multiplier;
      if (value === 0) return '#8B0000';
      if (value > 0 && value < threshold) return '#808080';
      return '#28a745';
    } else if (category === 'outSchool') {
      const threshold = 5 * multiplier;
      if (value === 0) return '#8B0000';
      if (value > 0 && value < threshold) return '#808080';
      return '#28a745';
    } else if (category === 'redHook') {
      const threshold = 3 * multiplier;
      if (value === 0) return '#8B0000';
      if (value > 0 && value < threshold) return '#808080';
      return '#28a745';
    }
    return '#000';
  };

  const getTotalColor = (hours) => {
    const multiplier = selectedTrimesters.length;
    const totalThreshold = 15 * multiplier;
    const inSchoolThreshold = 5 * multiplier;
    const outSchoolThreshold = 5 * multiplier;
    const redHookThreshold = 3 * multiplier;

    if (hours.overall === 0) {
      return '#D3D3D3';
    }

    const anyInMiddleGrey = 
      (hours.inSchool > 0 && hours.inSchool < inSchoolThreshold) ||
      (hours.outSchool > 0 && hours.outSchool < outSchoolThreshold) ||
      (hours.redHook > 0 && hours.redHook < redHookThreshold);

    if (anyInMiddleGrey) {
      return '#808080';
    }

    if (hours.overall < totalThreshold) {
      return '#808080';
    }

    return '#28a745';
  };

  const toggleTrimester = (trimNum) => {
    setSelectedTrimesters(prev => {
      if (prev.includes(trimNum)) {
        return prev.filter(t => t !== trimNum);
      } else {
        return [...prev, trimNum].sort();
      }
    });
  };

  const toggleGrade = (grade) => {
    setSelectedGrades(prev => {
      if (prev.includes(grade)) {
        return prev.filter(g => g !== grade);
      } else {
        return [...prev, grade].sort();
      }
    });
  };

  const getFilteredAndSortedMembers = () => {
    let filtered = members.filter(member => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const email = member.email?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = fullName.includes(searchLower) || email.includes(searchLower);
      
      if (!nameMatch) return false;
      
      if (selectedGrades.length > 0 && !selectedGrades.includes(member.grade)) {
        return false;
      }
      
      if (minHours !== '') {
        const hours = calculateMemberHours(member.id);
        const selectedHours = getSelectedHours(hours);
        const totalHours = selectedHours.overall;
        
        if (totalHours < parseFloat(minHours)) return false;
      }
      
      return true;
    });

    const membersWithHours = filtered.map(member => ({
      ...member,
      hours: calculateMemberHours(member.id)
    }));

    membersWithHours.sort((a, b) => {
      let aValue, bValue;
      const aSelected = getSelectedHours(a.hours);
      const bSelected = getSelectedHours(b.hours);

      if (sortBy === 'name') {
        aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
        bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
      } else if (sortBy === 'total') {
        aValue = aSelected.overall;
        bValue = bSelected.overall;
      } else if (sortBy === 'grade') {
        aValue = a.grade || 0;
        bValue = b.grade || 0;
      } else if (sortBy === 'inSchool') {
        aValue = aSelected.inSchool;
        bValue = bSelected.inSchool;
      } else if (sortBy === 'outSchool') {
        aValue = aSelected.outSchool;
        bValue = bSelected.outSchool;
      } else if (sortBy === 'redHook') {
        aValue = aSelected.redHook;
        bValue = bSelected.redHook;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return membersWithHours;
  };

  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getDropdownLabel = () => {
    if (selectedTrimesters.length === 0) return 'Select Trimesters';
    if (selectedTrimesters.length === 3) return 'All Trimesters';
    return selectedTrimesters.map(t => `T${t}`).join(', ');
  };

  const getGradeDropdownLabel = () => {
    if (selectedGrades.length === 0) return 'Select Grades';
    if (selectedGrades.length === 3) return 'All Grades';
    return selectedGrades.map(g => `Grade ${g}`).join(', ');
  };

  const calculateTotals = (filteredMembers) => {
    const totals = {
      inSchool: 0,
      outSchool: 0,
      redHook: 0,
      overall: 0
    };

    filteredMembers.forEach(member => {
      const selectedHours = getSelectedHours(member.hours);
      totals.inSchool += selectedHours.inSchool;
      totals.outSchool += selectedHours.outSchool;
      totals.redHook += selectedHours.redHook;
      totals.overall += selectedHours.overall;
    });

    return totals;
  };

  const filteredMembers = getFilteredAndSortedMembers();
  const totals = calculateTotals(filteredMembers);

  if (!canViewHours) {
    return <div className="hours-viewer-error">You do not have permission to view member hours.</div>;
  }

  if (loading) {
    return <div className="hours-viewer-loading">Loading member hours...</div>;
  }

  return (
    <div className="hours-viewer-container">
      <div className="hours-viewer-header">
        <h2>Member Catalogue</h2>
        <div className="hours-viewer-controls">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="multi-select-container">
            <button 
              className="multi-select-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {getDropdownLabel()}
              <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {isDropdownOpen && (
              <div className="multi-select-dropdown">
                <label className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={selectedTrimesters.includes(1)}
                    onChange={() => toggleTrimester(1)}
                  />
                  <span>Trimester 1</span>
                </label>
                <label className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={selectedTrimesters.includes(2)}
                    onChange={() => toggleTrimester(2)}
                  />
                  <span>Trimester 2</span>
                </label>
                <label className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={selectedTrimesters.includes(3)}
                    onChange={() => toggleTrimester(3)}
                  />
                  <span>Trimester 3</span>
                </label>
              </div>
            )}
          </div>
          <div className="multi-select-container">
            <button 
              className="multi-select-button"
              onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
            >
              {getGradeDropdownLabel()}
              <span className="dropdown-arrow">{isGradeDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {isGradeDropdownOpen && (
              <div className="multi-select-dropdown">
                {[10, 11, 12].map(grade => (
                  <label key={grade} className="multi-select-option">
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(grade)}
                      onChange={() => toggleGrade(grade)}
                    />
                    <span>Grade {grade}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hours-table-container">
        <table className="hours-table">
          <thead>
            <tr className="column_names">
              <th onClick={() => toggleSort('name')} className="sortable">
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>Email</th>
              <th onClick={() => toggleSort('grade')} className="sortable">
                Grade {sortBy === 'grade' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th>Role</th>
              <th onClick={() => toggleSort('inSchool')} className="sortable hours-col">
                In-School {sortBy === 'inSchool' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => toggleSort('outSchool')} className="sortable hours-col">
                Out-of-School {sortBy === 'outSchool' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => toggleSort('redHook')} className="sortable hours-col">
                Red Hook {sortBy === 'redHook' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => toggleSort('total')} className="sortable hours-col total-col">
                Total {sortBy === 'total' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
            <tr className="totals-row">
              <td colSpan="4" className="totals-label">Totals</td>
              <td className="hours-cell total-cell">{totals.inSchool.toFixed(1)}</td>
              <td className="hours-cell total-cell">{totals.outSchool.toFixed(1)}</td>
              <td className="hours-cell total-cell">{totals.redHook.toFixed(1)}</td>
              <td className="hours-cell total-cell">{totals.overall.toFixed(1)}</td>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No members found</td>
              </tr>
            ) : (
              filteredMembers.map(member => {
                const selectedHours = getSelectedHours(member.hours);

                return (
                  <tr key={member.id}>
                    <td className="name-cell">
                      {member.first_name} {member.last_name}
                    </td>
                    <td className="email-cell">{member.email}</td>
                    <td className="grade-cell">{member.grade || 'N/A'}</td>
                    <td className="role-cell">
                      <span className={`role-badge-small ${member.role}`}>
                        {member.role === 'leader' ? 'Leader' : 'Member'}
                      </span>
                    </td>
                    <td 
                      className="hours-cell"
                      style={{ color: getHourColor(selectedHours.inSchool, 'inSchool') }}
                    >
                      {selectedHours.inSchool.toFixed(1)}
                    </td>
                    <td 
                      className="hours-cell"
                      style={{ color: getHourColor(selectedHours.outSchool, 'outSchool') }}
                    >
                      {selectedHours.outSchool.toFixed(1)}
                    </td>
                    <td 
                      className="hours-cell"
                      style={{ color: getHourColor(selectedHours.redHook, 'redHook') }}
                    >
                      {selectedHours.redHook.toFixed(1)}
                    </td>
                    <td 
                      className="hours-cell total-cell"
                      style={{ color: getTotalColor(selectedHours) }}
                    >
                      {selectedHours.overall.toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="hours-summary">
        <p className="summary-note">
          Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          {selectedTrimesters.length > 0 && ` for ${getDropdownLabel()}`}
        </p>
      </div>
    </div>
  );
};

export default MemberCatalogue;