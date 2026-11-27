import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  Plus,
  LayoutGrid,
  Settings2,
  Monitor,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import Button from '../../components/common/Button';
import { updateTheaterScreens } from '../../services/theaterService';
import { fetchApi } from '../../services/api';

const AdminScreenManagement = () => {
  const { theaterId } = useParams();
  const navigate = useNavigate();

  const [theater, setTheater] = useState(null);
  const [screens, setScreens] = useState([]);
  const [selectedScreenIdx, setSelectedScreenIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchApi('/theaters/admin')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const found = list.find((t) => t._id === theaterId);
        if (found) {
          setTheater(found);
          setScreens(found.screens || []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching theater', err);
        setIsLoading(false);
      });
  }, [theaterId]);

  const handleAddScreen = () => {
    if (screens.length >= 5) {
      setFeedback({ type: 'error', text: 'Maximum of 5 screens allowed per cinema.' });
      return;
    }
    const newScreen = {
      number: screens.length + 1,
      name: `Screen ${screens.length + 1}`,
      rows: 10,
      cols: 12,
      layout: Array.from({ length: 10 }, () =>
        Array.from({ length: 12 }, () => ({ type: 'seat' }))
      ),
      pricing: {
        A: 150, B: 150, C: 150, D: 150, E: 150,
        F: 200, G: 200, H: 200, I: 200, J: 200,
      },
    };
    setScreens([...screens, newScreen]);
    setSelectedScreenIdx(screens.length);
  };

  const updateCurrentScreen = (updates) => {
    const updatedScreens = [...screens];
    updatedScreens[selectedScreenIdx] = {
      ...updatedScreens[selectedScreenIdx],
      ...updates,
    };
    setScreens(updatedScreens);
  };

  const handleToggleSeat = (rowIdx, colIdx) => {
    const currentLayout = screens[selectedScreenIdx].layout.map((row) => [...row]);
    const cell = currentLayout[rowIdx][colIdx];
    currentLayout[rowIdx][colIdx] = {
      ...cell,
      type: cell.type === 'seat' ? 'aisle' : 'seat',
    };
    updateCurrentScreen({ layout: currentLayout });
  };

  const handleResizeLayout = (newRows, newCols) => {
    if (newRows < 1 || newCols < 1 || newRows > 20 || newCols > 25) {
      setFeedback({ type: 'error', text: 'Grid dimensions must be between 1x1 and 20x25.' });
      return;
    }
    const newLayout = Array.from({ length: newRows }, (_, r) =>
      Array.from({ length: newCols }, (_, c) => {
        if (screens[selectedScreenIdx].layout[r]?.[c]) {
          return screens[selectedScreenIdx].layout[r][c];
        }
        return { type: 'seat' };
      })
    );

    const newPricing = { ...(screens[selectedScreenIdx].pricing || {}) };
    for (let r = 0; r < newRows; r++) {
      const rowName = String.fromCharCode(65 + r);
      if (newPricing[rowName] === undefined) {
        newPricing[rowName] = r > 5 ? 200 : 150;
      }
    }

    updateCurrentScreen({
      rows: newRows,
      cols: newCols,
      layout: newLayout,
      pricing: newPricing,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateTheaterScreens(theaterId, screens);
      setFeedback({ type: 'success', text: 'Screen configurations saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save screen configurations.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading auditorium settings...</p>
      </div>
    );
  }

  if (!theater) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--mg-danger)' }}>
          Cinema not found or permission denied.
        </p>
      </div>
    );
  }

  const currentScreen = screens[selectedScreenIdx];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-2 cursor-pointer hover:opacity-80"
            style={{ color: 'var(--mg-ink-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cinemas
          </button>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Screen &amp; Seat Layout
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Configuring seating geometry and row pricing for{' '}
            <strong style={{ color: 'var(--mg-ink)' }}>{theater.name}</strong>
          </p>
        </div>

        {screens.length > 0 && (
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="w-4 h-4" />
            Save All Screens
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className="px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3"
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--mg-success-soft)' : 'var(--mg-danger-soft)',
            borderColor: feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
            color: feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
          }}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
                Screens (Max 5)
              </h2>
              <Button size="sm" variant="outline" onClick={handleAddScreen}>
                <Plus className="w-3.5 h-3.5" />
                Add Screen
              </Button>
            </div>

            <div className="space-y-2">
              {screens.map((s, idx) => {
                const selected = selectedScreenIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedScreenIdx(idx)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer"
                    style={{
                      backgroundColor: selected ? 'var(--mg-accent)' : 'var(--mg-surface-2)',
                      borderColor: selected ? 'var(--mg-accent)' : 'var(--mg-border)',
                      color: selected ? '#ffffff' : 'var(--mg-ink)',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      {s.name}
                    </span>
                    <span className="text-xs font-mono opacity-80">
                      {s.rows}x{s.cols}
                    </span>
                  </button>
                );
              })}

              {screens.length === 0 && (
                <p className="py-8 text-center text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                  No auditoriums configured yet. Click Add Screen to create one.
                </p>
              )}
            </div>
          </div>

          {currentScreen && (
            <div
              className="rounded-xl border p-5 space-y-4"
              style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--mg-ink-3)' }}>
                <Settings2 className="w-4 h-4" />
                Screen Properties
              </h2>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Screen Name
                </label>
                <input
                  type="text"
                  value={currentScreen.name}
                  onChange={(e) => updateCurrentScreen({ name: e.target.value })}
                  className="mg-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Rows (1–20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={currentScreen.rows}
                    onChange={(e) => handleResizeLayout(parseInt(e.target.value, 10) || 1, currentScreen.cols)}
                    className="mg-input w-full px-3 py-2 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Columns (1–25)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={currentScreen.cols}
                    onChange={(e) => handleResizeLayout(currentScreen.rows, parseInt(e.target.value, 10) || 1)}
                    className="mg-input w-full px-3 py-2 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visual Designer */}
        <div className="lg:col-span-8">
          {currentScreen ? (
            <div
              className="rounded-xl border p-5 sm:p-6"
              style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                  <h2 className="text-base font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                    Seat Map Editor — {currentScreen.name}
                  </h2>
                </div>

                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded border inline-block"
                      style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border-strong)' }}
                    />
                    Seat
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded border border-dashed inline-block"
                      style={{ borderColor: 'var(--mg-border)' }}
                    />
                    Aisle (click cell to toggle)
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-max mx-auto flex flex-col items-center gap-2.5">
                  <div className="w-72 text-center mb-6">
                    <div
                      className="h-1.5 rounded-full mb-1.5"
                      style={{ backgroundColor: 'var(--mg-accent)' }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--mg-ink-3)' }}>
                      Cinema Screen
                    </span>
                  </div>

                  {currentScreen.layout.map((row, rIdx) => {
                    const rowName = String.fromCharCode(65 + rIdx);
                    return (
                      <div key={rIdx} className="flex items-center gap-4">
                        {/* Row label + Price */}
                        <div className="w-24 flex items-center justify-between gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold w-4" style={{ color: 'var(--mg-ink-2)' }}>
                            {rowName}
                          </span>
                          <div
                            className="flex items-center px-2 py-1 rounded border text-xs"
                            style={{
                              backgroundColor: 'var(--mg-input-bg)',
                              borderColor: 'var(--mg-border)',
                            }}
                          >
                            <span style={{ color: 'var(--mg-ink-3)' }}>₹</span>
                            <input
                              type="number"
                              aria-label={`Price for row ${rowName}`}
                              value={currentScreen.pricing?.[rowName] ?? 150}
                              onChange={(e) => {
                                const newPricing = { ...currentScreen.pricing };
                                newPricing[rowName] = parseInt(e.target.value, 10) || 0;
                                updateCurrentScreen({ pricing: newPricing });
                              }}
                              className="w-12 bg-transparent font-mono font-semibold text-right focus:outline-none"
                              style={{ color: 'var(--mg-success)' }}
                            />
                          </div>
                        </div>

                        {/* Seat / Aisle Buttons */}
                        <div className="flex gap-1.5">
                          {row.map((cell, cIdx) => {
                            const isSeat = cell.type === 'seat';
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleToggleSeat(rIdx, cIdx)}
                                title={`Row ${rowName} Seat ${cIdx + 1}: ${isSeat ? 'Seat' : 'Aisle'}`}
                                className="w-7 h-7 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center border"
                                style={{
                                  backgroundColor: isSeat ? 'var(--mg-surface-2)' : 'transparent',
                                  borderColor: isSeat ? 'var(--mg-border-strong)' : 'var(--mg-border)',
                                  borderStyle: isSeat ? 'solid' : 'dashed',
                                  color: isSeat ? 'var(--mg-ink)' : 'var(--mg-ink-3)',
                                }}
                              >
                                {isSeat ? cIdx + 1 : '·'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border border-dashed py-20 text-center"
              style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
            >
              <Monitor className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--mg-ink-2)' }}>
                Select a screen on the left or create a new one to start editing seats.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScreenManagement;
