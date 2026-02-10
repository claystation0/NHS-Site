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
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const [formData, setFormData] = useState({
    hours: '',
    description: '',
    date: '',
    trimester: '',
    category: '',
    supervisor_name: '',
    signature: '',
    status: 'in_progress'
  });

  // Canvas dimensions (internal resolution)
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 150;

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
    
    // Set internal resolution
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Clear with background color
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load existing signature if available
    if (formData.signature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

  const handleSubmit = async (saveAs = 'in_progress') => {
    if (saveAs === 'completed') {
      if (!formData.hours || !formData.description || !formData.date || !formData.trimester || !formData.category || !formData.supervisor_name) {
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
      date: formData.date || null,
      trimester: formData.trimester ? parseInt(formData.trimester) : null,
      category: formData.category || null,
      supervisor_name: formData.supervisor_name || null,
      signature: saveAs === 'completed' && !isCanvasBlank(canvasRef.current) ? canvasRef.current.toDataURL('image/png') : formData.signature || null,
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
    setFormData({
      hours: entry.hours?.toString() || '',
      description: entry.description || '',
      date: entry.date ? entry.date.split('T')[0] : '',
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
      date: '',
      trimester: '',
      category: '',
      supervisor_name: '',
      signature: '',
      status: 'in_progress'
    });
    setEditingId(null);
    setShowNewForm(false);
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
    
    // Get the display position
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate position relative to canvas display
    const displayX = clientX - rect.left;
    const displayY = clientY - rect.top;
    
    // Scale to internal canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: displayX * scaleX,
      y: displayY * scaleY
    };
  };

  const startDrawing = (canvas) => (e) => {
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
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = (canvas) => () => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveModalSignature = () => {
    if (modalCanvasRef.current && canvasRef.current) {
      // Copy modal canvas to inline canvas
      const modalCtx = modalCanvasRef.current.getContext('2d');
      const inlineCtx = canvasRef.current.getContext('2d');
      
      inlineCtx.drawImage(modalCanvasRef.current, 0, 0);
    }
    setShowSignatureModal(false);
  };

  const getTotalHours = () => {
    return hours
      .filter(h => h.status === 'completed')
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  const getCategoryHours = (category) => {
    return hours
      .filter(h => h.status === 'completed' && h.category === category)
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  const categoryLabels = {
    red_hook: 'Red Hook',
    out_school: 'Out of School',
    in_school: 'In School'
  };

  const inProgressHours = hours.filter(h => h.status === 'in_progress');
  const completedHours = hours.filter(h => h.status === 'completed');

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
              <label>Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
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
                      {entry.date && <p><strong>Date:</strong> {new Date(entry.date).toLocaleDateString()}</p>}
                      {entry.hours && <p><strong>Hours:</strong> {entry.hours}</p>}
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
        {completedHours.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p>No completed hours yet</p>
            <p>Start by adding a new entry above</p>
          </div>
        ) : (
          <div className="hours-grid">
            {completedHours.map((entry) => (
              <div key={entry.id} className="hour-card">
                <div className="card-header">
                  <div className="card-title-area">
                    <div className="card-title">
                      <h3>{entry.description}</h3>
                    </div>
                    <div className="card-details">
                      {entry.description && <p><strong>Activity:</strong> {entry.description}</p>}
                      {entry.date && <p><strong>Date:</strong> {new Date(entry.date).toLocaleDateString()}</p>}
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

      {/* Signature Modal */}
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