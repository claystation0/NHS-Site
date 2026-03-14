import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import './styles/volunteer.css';

export default function Volunteer({ session }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [canvasHasContent, setCanvasHasContent] = useState(false);
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);

  const [formData, setFormData] = useState({
    hours: '',
    description: '',
    dates: [],
    trimester: '',
    category: '',
    supervisor_name: '',
    signature: '',
    status: 'in_progress'
  });

  // Canvas dimensions (internal resolution)
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 150;

  // Hours are locked when the canvas has a signature AND hours has a value
  const hoursLocked = canvasHasContent && !!formData.hours;

  useEffect(() => {
    if (session?.user) {
      loadHours();
    }
  }, [session]);

  useEffect(() => {
    if (showNewForm && canvasRef.current) {
      initializeCanvas(canvasRef.current);
    }
  }, [showNewForm]);

  useEffect(() => {
    if (showSignatureModal && modalCanvasRef.current) {
      initializeCanvas(modalCanvasRef.current);
    }
  }, [showSignatureModal]);

  const initializeCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (formData.signature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCanvasHasContent(true);
      };
      img.src = formData.signature;
    }
  };

  const loadHours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_hours')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading hours:', error);
      alert('Error loading your hours: ' + error.message);
    } else {
      setHours(data || []);
    }
    setLoading(false);
  };

  const addDate = () => {
    if (!tempDate) return;
    if (!formData.dates.includes(tempDate)) {
      setFormData({
        ...formData,
        dates: [...formData.dates, tempDate].sort()
      });
    }
    setTempDate('');
  };

  const removeDate = (index) => {
    setFormData({
      ...formData,
      dates: formData.dates.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (saveAs = 'in_progress') => {
    if (saveAs === 'completed') {
      if (!formData.hours || !formData.description || formData.dates.length === 0 || !formData.trimester || !formData.category || !formData.supervisor_name) {
        alert('Please fill in all required fields to mark as completed');
        return;
      }

      const hoursNum = parseFloat(formData.hours);
      if (hoursNum <= 0) {
        alert('Hours must be greater than 0');
        return;
      }

      if (isCanvasBlank(canvasRef.current)) {
        alert('Please provide a signature to mark as completed');
        return;
      }
    }

    if (!formData.description) {
      alert('Please enter a description');
      return;
    }

    setLoading(true);

    const dataToSave = {
      description: formData.description,
      hours: formData.hours ? parseFloat(formData.hours) : null,
      dates: formData.dates.length > 0 ? formData.dates : null,
      trimester: formData.trimester ? parseInt(formData.trimester) : null,
      category: formData.category || null,
      supervisor_name: formData.supervisor_name || null,
      // Save signature on both draft and completed if canvas has content
      signature: !isCanvasBlank(canvasRef.current)
        ? canvasRef.current.toDataURL('image/png')
        : formData.signature || null,
      status: saveAs
    };

    if (editingId) {
      const { error } = await supabase
        .from('service_hours')
        .update(dataToSave)
        .eq('id', editingId);

      if (error) {
        alert('Error updating entry: ' + error.message);
      } else {
        resetForm();
        loadHours();
      }
    } else {
      const { error } = await supabase
        .from('service_hours')
        .insert({
          user_id: session.user.id,
          ...dataToSave
        });

      if (error) {
        alert('Error saving entry: ' + error.message);
      } else {
        resetForm();
        loadHours();
      }
    }
    setLoading(false);
  };

  const handleEdit = (entry) => {
    if (entry.status === 'completed') {
      alert('Cannot edit completed hours. Please contact an administrator if changes are needed.');
      return;
    }

    setEditingId(entry.id);
    setShowNewForm(true);
    setCanvasHasContent(!!entry.signature);
    setFormData({
      hours: entry.hours?.toString() || '',
      description: entry.description || '',
      dates: entry.dates || [],
      trimester: entry.trimester?.toString() || '',
      category: entry.category || '',
      supervisor_name: entry.supervisor_name || '',
      signature: entry.signature || '',
      status: entry.status || 'in_progress'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('service_hours')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting entry: ' + error.message);
    } else {
      loadHours();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      hours: '',
      description: '',
      dates: [],
      trimester: '',
      category: '',
      supervisor_name: '',
      signature: '',
      status: 'in_progress'
    });
    setTempDate('');
    setEditingId(null);
    setShowNewForm(false);
    setCanvasHasContent(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const isCanvasBlank = (canvas) => {
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];
      if (r !== 250 || g !== 249 || b !== 246 || a !== 255) {
        return false;
      }
    }
    return true;
  };

  const getCanvasCoordinates = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const displayX = clientX - rect.left;
    const displayY = clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: displayX * scaleX,
      y: displayY * scaleY
    };
  };

  const startDrawing = (canvas) => (e) => {
    // Block signing if hours field is empty or zero
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      alert('Please enter your hours before signing.');
      return;
    }
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(canvas, e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (canvas) => (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(canvas, e);

    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Mark canvas as having content once the user starts drawing
    setCanvasHasContent(true);
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  // Clears the canvas visually, resets canvasHasContent, and wipes
  // formData.signature so the DB field is nulled on the next save
  const clearSignature = (canvas) => () => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setCanvasHasContent(false);
    setFormData(prev => ({ ...prev, signature: '' }));
  };

  const saveModalSignature = () => {
    if (modalCanvasRef.current && canvasRef.current) {
      const inlineCtx = canvasRef.current.getContext('2d');
      inlineCtx.drawImage(modalCanvasRef.current, 0, 0);
      if (!isCanvasBlank(modalCanvasRef.current)) {
        setCanvasHasContent(true);
      }
    }
    setShowSignatureModal(false);
  };

  const getTotalHours = () => {
    return hours
      .filter(h => h.status === 'completed')
      .reduce((sum, entry) => {
        const numDates = entry.dates?.length || 1;
        return sum + (entry.hours || 0) * numDates;
      }, 0);
  };

  const getCategoryHours = (category) => {
    return hours
      .filter(h => h.status === 'completed' && h.category === category)
      .reduce((sum, entry) => {
        const numDates = entry.dates?.length || 1;
        return sum + (entry.hours || 0) * numDates;
      }, 0);
  };

  const categoryLabels = {
    red_hook: 'Red Hook',
    out_school: 'Out of School',
    in_school: 'In School'
  };

  const formatDatesDisplay = (dates) => {
    if (!dates || dates.length === 0) return '';
    if (dates.length === 1) {
      return new Date(dates[0] + 'T00:00:00').toLocaleDateString();
    }
    return `${dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')}`;
  };

  const inProgressHours = hours.filter(h => h.status === 'in_progress');
  const completedHours = hours.filter(h => h.status === 'completed');

  const flattenedCompletedHours = completedHours.reduce((acc, entry) => {
    if (entry.dates && entry.dates.length > 0) {
      entry.dates.forEach(dateStr => {
        acc.push({ 
          ...entry, 
          displayDate: dateStr, 
          displayId: `${entry.id}-${dateStr}` 
        });
      });
    } else {
      acc.push({ 
        ...entry, 
        displayDate: entry.dates?.[0] || null,
        displayId: entry.id 
      });
    }
    return acc;
  }, []);

  return (
    <div className="volunteer-container">
      <div className="volunteer-stats">
        <h1>Service Summary</h1>
        <div className="stats-grid">
          <div className="stat-card">
            <p>In School</p>
            <p>{getCategoryHours('in_school')}</p>
          </div>
          <div className="stat-card">
            <p>Out of School</p>
            <p>{getCategoryHours('out_school')}</p>
          </div>
          <div className="stat-card">
            <p>Red Hook</p>
            <p>{getCategoryHours('red_hook')}</p>
          </div>
        </div>
      </div>

      {showNewForm && (
        <div className="entry-form">
          <div className="form-header">
            <h2>{editingId ? 'Edit Entry' : 'New Entry'}</h2>
            <button className="close-button" onClick={resetForm}>×</button>
          </div>

          <div className="form-grid">
            <div className="form-field full-width">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                maxLength="500"
                placeholder="Describe your service activity"
              />
            </div>

            <div className="form-field">
              <label>Hours per Day</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={hoursLocked}
                title={hoursLocked ? 'Clear the signature to edit hours' : ''}
                style={hoursLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              />
              {hoursLocked && (
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                  Clear the signature to edit hours.
                </p>
              )}
            </div>

            <div className="form-field">
              <label>Date(s)</label>
              <div style={{ 
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start'
              }}>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDate();
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addDate}
                  className="btn-add-date"
                  style={{
                    padding: '0.875rem 1rem',
                    background: '#c93030',
                    color: 'white',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Add
                </button>
              </div>
              {formData.dates.length > 0 && (
                <div style={{ 
                  marginTop: '0.75rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem'
                }}>
                  {formData.dates.map((date, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#FAF9F6',
                        border: '2px solid #000',
                        borderRadius: '6px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <button
                        type="button"
                        onClick={() => removeDate(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c93030',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 700,
                          padding: 0,
                          lineHeight: 1,
                          marginLeft: '0.1rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>Trimester</label>
              <select
                value={formData.trimester}
                onChange={(e) => setFormData({ ...formData, trimester: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="1">Trimester 1</option>
                <option value="2">Trimester 2</option>
                <option value="3">Trimester 3</option>
              </select>
            </div>

            <div className="form-field">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="red_hook">Red Hook</option>
                <option value="out_school">Out of School</option>
                <option value="in_school">In School</option>
              </select>
            </div>

            <div className="form-field full-width">
              <label>Supervisor Name</label>
              <input
                type="text"
                value={formData.supervisor_name}
                onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                placeholder="Name of supervising adult"
              />
            </div>

            <div className="form-field full-width">
              <label>Supervisor Signature</label>
              <div className="signature-container">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing(canvasRef.current)}
                  onMouseMove={draw(canvasRef.current)}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing(canvasRef.current)}
                  onTouchMove={draw(canvasRef.current)}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: '100%',
                    height: '150px',
                    border: '2px solid black',
                    borderRadius: '7px',
                    cursor: 'crosshair',
                    background: '#FAF9F6',
                    touchAction: 'none'
                  }}
                />
                <div className="signature-actions">
                  <button
                    type="button"
                    onClick={clearSignature(canvasRef.current)}
                    className="btn-cancel"
                  >
                    Clear Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    className="btn-draft"
                  >
                    Open Full Screen Signature
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-draft"
              onClick={() => handleSubmit('in_progress')}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              className="btn-complete"
              onClick={() => handleSubmit('completed')}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Mark as Completed'}
            </button>
            <button className="btn-cancel" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNewForm && (
        <button className="add-new-button" onClick={() => setShowNewForm(true)}>
          <div className="add-icon-circle">+</div>
          <span className="add-new-text">Add New Service Hours</span>
        </button>
      )}

      {inProgressHours.length > 0 && (
        <div className="hours-section">
          <div className="section-header">
            <span className="section-indicator yellow"></span>
            <h2>In Progress</h2>
          </div>
          <div className="hours-grid">
            {inProgressHours.map((entry) => (
              <div key={entry.id} className="hour-card draft">
                <div className="card-header">
                  <div className="card-title-area">
                    <div className="card-title">
                      <h3>{entry.description}</h3>
                    </div>
                    <div className="card-details">
                      {entry.dates && entry.dates.length > 0 && <p><strong>Date(s):</strong> {formatDatesDisplay(entry.dates)}</p>}
                      {entry.hours && <p><strong>Hours per Day:</strong> {entry.hours}</p>}
                      {entry.dates && entry.dates.length > 0 && entry.hours && (
                        <p><strong>Total Hours:</strong> {(entry.hours * entry.dates.length).toFixed(1)}</p>
                      )}
                      {entry.trimester && <p><strong>Trimester:</strong> {entry.trimester}</p>}
                      {entry.category && <p><strong>Category:</strong> {categoryLabels[entry.category]}</p>}
                      {entry.supervisor_name && <p><strong>Supervisor:</strong> {entry.supervisor_name}</p>}
                      {entry.signature && (
                        <div>
                          <p><strong>Signature:</strong></p>
                          <img src={entry.signature} alt="Signature" style={{ maxWidth: '200px', border: '1px solid #ccc', marginTop: '0.5rem' }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    <span className="draft-badge">Draft</span>
                    <button className="btn-icon edit" onClick={() => handleEdit(entry)}>
                      ✎
                    </button>
                    <button className="btn-icon delete" onClick={() => handleDelete(entry.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hours-section">
        <div className="section-header">
          <span className="section-indicator black"></span>
          <h2>Completed Hours</h2>
        </div>
        {flattenedCompletedHours.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p>No completed hours yet</p>
            <p>Start by adding a new entry above</p>
          </div>
        ) : (
          <div className="hours-grid">
            {flattenedCompletedHours.map((entry) => (
              <div key={entry.displayId} className="hour-card">
                <div className="card-header">
                  <div className="card-title-area">
                    <div className="card-title">
                      <h3>{entry.description}</h3>
                    </div>
                    <div className="card-details">
                      {entry.description && <p><strong>Activity:</strong> {entry.description}</p>}
                      <p><strong>Date:</strong> {entry.displayDate ? new Date(entry.displayDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                      {entry.hours && <p><strong>Hours:</strong> {entry.hours}</p>}
                      {entry.trimester && <p><strong>Trimester:</strong> {entry.trimester}</p>}
                      {entry.category && <p><strong>Category:</strong> {categoryLabels[entry.category]}</p>}
                      {entry.supervisor_name && <p><strong>Supervisor:</strong> {entry.supervisor_name}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSignatureModal && (
        <div className="signature-modal-overlay">
          <div className="signature-modal">
            <div className="signature-modal-header">
              <h2>Supervisor Signature</h2>
              <button className="close-button" onClick={() => setShowSignatureModal(false)}>×</button>
            </div>
            <div className="signature-modal-content">
              <p className="signature-instruction">Please sign below</p>
              <div className="signature-canvas-wrapper">
                <canvas
                  ref={modalCanvasRef}
                  onMouseDown={startDrawing(modalCanvasRef.current)}
                  onMouseMove={draw(modalCanvasRef.current)}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing(modalCanvasRef.current)}
                  onTouchMove={draw(modalCanvasRef.current)}
                  onTouchEnd={stopDrawing}
                  className="signature-modal-canvas"
                />
                <div className="signature-line"></div>
              </div>
            </div>
            <div className="signature-modal-actions">
              <button
                type="button"
                onClick={clearSignature(modalCanvasRef.current)}
                className="btn-cancel"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={saveModalSignature}
                className="btn-complete"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}