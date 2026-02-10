import { useState, useEffect } from "react";
import { supabase } from './supabaseClient';
import './styles/calendar.css';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    description: '',
    event_date: ''
  });

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => {
    checkUserRole();
    fetchEvents();

    const subscription = supabase
      .channel('events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setUserRole(profile.role);
      }
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (!error) {
      const eventsByDate = {};
      (data || []).forEach(event => {
        const dateKey = event.event_date;
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      });
      setEvents(eventsByDate);
    }
    setLoading(false);
  };

  const canManageEvents = userRole === 'admin' || userRole === 'leader';

  const handleDayClick = (day, e) => {
    // Don't open modal if clicking on an event color bar
    if (e.target.classList.contains('event-color-bar')) {
      return;
    }
    
    if (!canManageEvents) return;
    
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateKey);
    setFormData({
      title: '',
      category: 'other',
      description: '',
      event_date: dateKey
    });
    setModalMode('add');
    setShowModal(true);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      category: event.category,
      description: event.description || '',
      event_date: event.event_date
    });
    setModalMode(canManageEvents ? 'edit' : 'view');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      return;
    }

    if (modalMode === 'add') {
      const { error } = await supabase
        .from('events')
        .insert([{ ...formData, created_by: userId }]);

      if (error) {
        alert('Failed to create event');
      } else {
        setShowModal(false);
        fetchEvents();
      }
    } else if (modalMode === 'edit') {
      const { error } = await supabase
        .from('events')
        .update(formData)
        .eq('id', selectedEvent.id);

      if (error) {
        alert('Failed to update event');
      } else {
        setShowModal(false);
        fetchEvents();
      }
    }
  };

  const handleDelete = async () => {

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', selectedEvent.id);

    if (!error) {
      setShowModal(false);
      fetchEvents();
    }
  };

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= totalDays; day++) {
    days.push(day);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const getCategoryColor = (category) => {
    const colors = {
      'mandatory': '#c93030',
      'in-school': '#d4a574',
      'out-of-school': '#7BB274',
      'red-hook': '#4a5568',
      'other': 'grey'
    };
    return colors[category] || '#718096';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'mandatory': 'Mandatory',
      'in-school': 'In-School',
      'out-of-school': 'Out-of-School',
      'red-hook': 'Red Hook',
      'other': 'Other'
    };
    return labels[category] || category;
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const currentMonthEvents = Object.entries(events)
    .filter(([dateKey]) => {
      const eventDate = new Date(dateKey);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    })
    .flatMap(([dateKey, dayEvents]) => dayEvents)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          <button onClick={prevMonth}>◀</button>
          <h2>
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button onClick={nextMonth}>▶</button>
        </div>

        <div className="calendar-weekdays">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div className="calendar-days">
          {days.map((day, index) => {
            if (!day) return <div key={index} className="calendar-day-empty" />;

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = events[dateKey] || [];
            const today = isToday(day);

            return (
              <div 
                key={index} 
                className={`calendar-day ${canManageEvents ? 'clickable' : ''} ${today ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                onClick={(e) => handleDayClick(day, e)}
                style={today ? { border: '2px solid #c93030' } : {}}
              >
                {dayEvents.length > 0 ? (
                  <div className="calendar-day-content">
                    <div className="event-color-bars">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className="event-color-bar"
                          style={{ backgroundColor: getCategoryColor(event.category) }}
                          onClick={(e) => handleEventClick(event, e)}
                          title={event.title}
                        />
                      ))}
                    </div>
                    <span className="day-number">{day}</span>
                  </div>
                ) : (
                  <span className="day-number">{day}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#c93030' }}></span>
            <span>Mandatory</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#d4a574' }}></span>
            <span>In-School</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#7BB274' }}></span>
            <span>Out-of-School</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#4a5568' }}></span>
            <span>Red Hook</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: 'grey' }}></span>
            <span>Other</span>
          </div>
        </div>

        {currentMonthEvents.length > 0 && (
          <div className="events-list-section">
            <h3>This Month's Events</h3>
            {currentMonthEvents.map((event) => (
              <div 
                key={event.id} 
                className="event-list-item"
                onClick={(e) => handleEventClick(event, e)}
                style={{ cursor: 'pointer' }}
              >
                <span 
                  className="event-list-dot" 
                  style={{ backgroundColor: getCategoryColor(event.category) }}
                />
                <div className="event-list-content">
                  <div className="event-list-title">{event.title}</div>
                  <div className="event-list-date">
                    {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} • {getCategoryLabel(event.category)}
                  </div>
                  {event.description && (
                    <div className="event-list-description">{event.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalMode === 'add' && 'Add Event'}
                {modalMode === 'edit' && 'Edit Event'}
                {modalMode === 'view' && 'Event Details'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  disabled={modalMode === 'view'}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  disabled={modalMode === 'view'}
                >
                  <option value="mandatory">Mandatory</option>
                  <option value="in-school">In-School</option>
                  <option value="out-of-school">Out-of-School</option>
                  <option value="red-hook">Red Hook</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  disabled={modalMode === 'view'}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  disabled={modalMode === 'view'}
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                {modalMode !== 'view' && (
                  <>
                    <button className="btn-primary" onClick={handleSubmit}>
                      {modalMode === 'add' ? 'Add Event' : 'Save Changes'}
                    </button>
                    {modalMode === 'edit' && (
                      <button className="btn-danger" onClick={handleDelete}>
                        Delete
                      </button>
                    )}
                  </>
                )}
                <button className="btn-secondary" onClick={() => setShowModal(false)}>
                  {modalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}