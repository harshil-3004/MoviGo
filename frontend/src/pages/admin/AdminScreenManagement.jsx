import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Plus, Trash2, Layout, Settings2, Info, Monitor, DollarSign } from 'lucide-react';
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

  // Fetch theater on load
  useEffect(() => {
    fetchApi('/theaters')
      .then(data => {
        const found = data.find(t => t._id === theaterId);
        if (found) {
          setTheater(found);
          setScreens(found.screens || []);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching theater", err);
        setIsLoading(false);
      });
  }, [theaterId]);

  const handleAddScreen = () => {
    if (screens.length >= 5) {
      alert("Maximum of 5 screens allowed per theater.");
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
        'A': 15, 'B': 15, 'C': 15, 'D': 15, 'E': 15,
        'F': 20, 'G': 20, 'H': 20, 'I': 20, 'J': 20
      }
    };
    setScreens([...screens, newScreen]);
    setSelectedScreenIdx(screens.length);
  };

  const updateCurrentScreen = (updates) => {
    const updatedScreens = [...screens];
    updatedScreens[selectedScreenIdx] = { ...updatedScreens[selectedScreenIdx], ...updates };
    setScreens(updatedScreens);
  };

  const handleToggleSeat = (rowIdx, colIdx) => {
    const currentLayout = [...screens[selectedScreenIdx].layout];
    const cell = currentLayout[rowIdx][colIdx];
    currentLayout[rowIdx][colIdx] = { ...cell, type: cell.type === 'seat' ? 'aisle' : 'seat' };
    updateCurrentScreen({ layout: currentLayout });
  };

  const handleResizeLayout = (newRows, newCols) => {
    if (newRows < 1 || newCols < 1 || newRows > 20 || newCols > 25) {
      alert("Please keep dimensions between 1x1 and 20x25");
      return;
    }
    const newLayout = Array.from({ length: newRows }, (_, r) => 
      Array.from({ length: newCols }, (_, c) => {
        // Try to preserve existing cell if possible
        if (screens[selectedScreenIdx].layout[r] && screens[selectedScreenIdx].layout[r][c]) {
          return screens[selectedScreenIdx].layout[r][c];
        }
        return { type: 'seat' };
      })
    );
    
    // Update pricing map if rows increased
    const newPricing = { ...screens[selectedScreenIdx].pricing };
    for (let r = 0; r < newRows; r++) {
       const rowName = String.fromCharCode(65 + r);
       if (!newPricing[rowName]) {
         newPricing[rowName] = r > 5 ? 20 : 15; // Default logic
       }
    }

    updateCurrentScreen({ rows: newRows, cols: newCols, layout: newLayout, pricing: newPricing });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTheaterScreens(theaterId, screens);
      alert("Theater screens updated successfully!");
    } catch (err) {
      alert("Failed to save screen configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-muted">Initialize neural link...</div>;
  if (!theater) return <div className="p-10 text-center text-red-500">Theater not found. Access Denied.</div>;

  const currentScreen = screens[selectedScreenIdx];

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors mb-4 group cursor-pointer">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">Screen Architect</h1>
          <p className="text-muted">Designing spatial layouts for <span className="text-primary font-bold">{theater.name}</span></p>
        </div>
        <div className="flex gap-4">
           {screens.length > 0 && (
             <Button onClick={handleSave} disabled={isSaving} className="shadow-[0_0_20px_rgba(244,63,94,0.3)]">
               <Save className="w-5 h-5 mr-2" /> {isSaving ? 'Synchronizing...' : 'Save Configuration'}
             </Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar: Screen List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Screens (Max 5)</h3>
               <button onClick={handleAddScreen} className="p-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />
               </button>
             </div>
             
             <div className="space-y-2">
               {screens.map((s, idx) => (
                 <button 
                   key={idx}
                   onClick={() => setSelectedScreenIdx(idx)}
                   className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                     selectedScreenIdx === idx 
                     ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                     : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     <Monitor className="w-4 h-4" />
                     <span className="font-bold">{s.name}</span>
                   </div>
                   <span className="text-[10px] uppercase font-black opacity-50">{s.rows}x{s.cols}</span>
                 </button>
               ))}
               
               {screens.length === 0 && (
                 <div className="py-10 text-center text-xs text-muted">No screens defined. Click + to begin.</div>
               )}
             </div>
          </div>

          {currentScreen && (
            <div className="bg-surface/30 border border-white/5 rounded-2xl p-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                 <Settings2 className="w-4 h-4" /> Properties
               </h3>
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted mb-2">Screen Name</label>
                    <input 
                      type="text" 
                      value={currentScreen.name} 
                      onChange={(e) => updateCurrentScreen({ name: e.target.value })}
                      className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted mb-2">Rows</label>
                      <input 
                        type="number" 
                        value={currentScreen.rows} 
                        onChange={(e) => handleResizeLayout(parseInt(e.target.value) || 1, currentScreen.cols)}
                        className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted mb-2">Cols</label>
                      <input 
                        type="number" 
                        value={currentScreen.cols} 
                        onChange={(e) => handleResizeLayout(currentScreen.rows, parseInt(e.target.value) || 1)}
                        className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Main: Visual Designer */}
        <div className="lg:col-span-3 space-y-6">
          {currentScreen ? (
            <div className="bg-surface/50 border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
              
              <div className="flex items-center justify-between mb-12">
                 <h2 className="text-xl font-bold font-outfit flex items-center gap-3">
                   <Layout className="w-6 h-6 text-primary" /> Visual Seating Architect
                 </h2>
                 <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2 text-white/60"><div className="w-3 h-3 border border-white/20 rounded-sm"></div> Seat</div>
                    <div className="flex items-center gap-2 text-white/60"><div className="w-3 h-3 bg-white/5 border border-white/5 rounded-sm"></div> Aisle</div>
                 </div>
              </div>

              {/* Seating Grid */}
              <div className="w-full overflow-x-auto pb-10 hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                <div className="min-w-max mx-auto flex flex-col items-center gap-3">
                  
                  {/* Digital Screen Indicator */}
                  <div className="w-full max-w-sm h-1.5 bg-primary/40 rounded-full mb-10 shadow-[0_4px_20px_rgba(244,63,94,0.4)] relative">
                     <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase opacity-30">Cinema Screen</span>
                  </div>

                  {currentScreen.layout.map((row, rIdx) => {
                    const rowName = String.fromCharCode(65 + rIdx);
                    return (
                      <div key={rIdx} className="flex items-center gap-6">
                        <div className="w-20 flex-shrink-0 flex items-center justify-between">
                           <span className="text-xs font-black opacity-30">{rowName}</span>
                           <div className="flex items-center gap-1 group relative">
                              <DollarSign className="w-3 h-3 text-green-500/50" />
                              <input 
                                type="number" 
                                value={currentScreen.pricing[rowName] || 15}
                                onChange={(e) => {
                                  const newPricing = { ...currentScreen.pricing };
                                  newPricing[rowName] = parseInt(e.target.value) || 0;
                                  updateCurrentScreen({ pricing: newPricing });
                                }}
                                className="w-12 bg-transparent text-xs font-bold text-green-400 focus:outline-none"
                              />
                              <div className="absolute -top-10 left-0 bg-surface border border-white/10 px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Row Price</div>
                           </div>
                        </div>

                        <div className="flex gap-2">
                          {row.map((cell, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleToggleSeat(rIdx, cIdx)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] border transition-all duration-300 ${
                                cell.type === 'seat' 
                                ? 'border-primary/40 bg-primary/5 hover:bg-primary/30 hover:scale-110 active:scale-95' 
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/10'
                              }`}
                              title={`${rowName}${cIdx + 1} - ${cell.type === 'seat' ? 'Seat' : 'Aisle'}`}
                            >
                               {cell.type === 'seat' && <div className="w-1 h-1 bg-primary/40 rounded-full mx-auto"></div>}
                            </button>
                          ))}
                        </div>
                        
                        <span className="w-4 text-xs font-black opacity-30 flex-shrink-0">{rowName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-4">
                 <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                 <p className="text-sm text-white/70 leading-relaxed">
                   Click on any cell to toggle between a <span className="text-white font-bold">Seat</span> and an <span className="text-white font-bold">Aisle</span>. Use the price controls on the left to set custom pricing for each row. Standard prices (₹150-₹200) have been pre-populated according to distance from the screen.
                 </p>
              </div>

            </div>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center bg-surface/20 border border-dashed border-white/10 rounded-[2.5rem]">
               <Monitor className="w-16 h-16 text-muted mb-6 opacity-20" />
               <h3 className="text-xl font-bold font-outfit text-white/40">Select or Create a Screen to Begin Architecting</h3>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminScreenManagement;
