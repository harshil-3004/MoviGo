import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSeat, lockSeats } from '../../store/bookingSlice';

const SeatGrid = ({ fullShowtime }) => {
  const dispatch = useDispatch();
  const { selectedSeats, status } = useSelector(state => state.booking);

  // Fallback Mock Layout if no real configuration exists
  const generateMockLayout = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const theaterLayout = [];
    rows.forEach((rowLabel, rowIndex) => {
      const rowSeats = [];
      for (let i = 1; i <= 12; i++) {
        const isPremium = rowIndex >= 5 && rowIndex <= 8;
        const isReserved = (rowIndex * i) % 7 === 0;
        rowSeats.push({
          id: `${rowLabel}${i}`,
          number: i,
          tier: isPremium ? 'premium' : 'standard',
          price: isPremium ? 20 : 15,
          status: isReserved ? 'reserved' : 'available',
          isAisle: false
        });
      }
      theaterLayout.push({ row: rowLabel, seats: rowSeats });
    });
    return theaterLayout;
  };

  // Resolve current layout from DB or use mock
  let theaterLayout = [];
  if (fullShowtime && fullShowtime.theater && fullShowtime.theater.screens) {
    const screenNumber = fullShowtime.screenNumber || 1;
    const screen = fullShowtime.theater.screens.find(s => s.number === screenNumber);

    if (screen && screen.layout && screen.layout.length > 0) {
      theaterLayout = screen.layout.map((rowCells, rIdx) => {
        const rowLabel = String.fromCharCode(65 + rIdx);
        const rowPrice = screen.pricing ? screen.pricing[rowLabel] : 15;
        const tier = rowPrice > 15 ? 'premium' : 'standard';

        return {
          row: rowLabel,
          seats: rowCells.map((cell, cIdx) => {
            const seatId = `${rowLabel}${cIdx + 1}`;
            const isReserved =
              fullShowtime.bookedSeats?.includes(seatId) ||
              fullShowtime.lockedSeats?.some(ls => ls.seat === seatId) ||
              cell.isReserved;
            return {
              id: seatId,
              number: cIdx + 1,
              tier,
              price: rowPrice,
              isAisle: cell.type === 'aisle',
              status: cell.type === 'aisle' ? 'aisle' : (isReserved ? 'reserved' : 'available')
            };
          })
        };
      });
    } else {
      theaterLayout = generateMockLayout();
    }
  } else {
    theaterLayout = generateMockLayout();
  }

  // Find max columns across ALL rows
  const maxCols = theaterLayout.length > 0
    ? Math.max(...theaterLayout.map(r => r.seats.length))
    : 12;

  const handleSeatClick = (seat) => {
    if (seat.status === 'reserved' || seat.status === 'aisle') return;
    if (selectedSeats.length === 0 && status !== 'locked') {
      dispatch(lockSeats(300));
    }
    dispatch(toggleSeat(seat.id));
  };

  // ─── CELL SIZE: every cell (seat, aisle, ghost) is the SAME size ───
  const cellClass = 'w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0';

  return (
    <div className="w-full flex justify-center py-8 overflow-x-auto hide-scrollbar">
      <div className="min-w-max flex flex-col items-center">

        {/* Cinema Screen */}
        <div className="w-full max-w-2xl mb-16 relative">
          <div className="h-4 w-full bg-gradient-to-b from-primary/40 to-transparent blur-md rounded-[100%]"></div>
          <div className="h-10 w-full border-t-4 border-primary/40 rounded-[100%] -mt-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-primary/10"></div>
          </div>
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold tracking-[0.4em] uppercase">Cinema Screen</p>
        </div>

        {/* Seat Layout — CSS Grid ensures perfect column alignment */}
        <div className="flex flex-col gap-2">
          {theaterLayout.map((rowObj) => {
            // Pad to maxCols with ghost cells
            const paddedSeats = [...rowObj.seats];
            while (paddedSeats.length < maxCols) {
              paddedSeats.push({
                id: `ghost-${rowObj.row}-${paddedSeats.length}`,
                isGhost: true
              });
            }

            return (
              <div key={rowObj.row} className="flex items-center gap-2">
                {/* Left label */}
                <span className="w-5 text-xs text-white/40 font-bold flex-shrink-0 text-right select-none">
                  {rowObj.row}
                </span>

                {/* Fixed-width grid: every cell is identical size */}
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                >
                  {paddedSeats.map((seat) => {
                    // Ghost — invisible, same size
                    if (seat.isGhost) {
                      return <div key={seat.id} className={`${cellClass} opacity-0`} />;
                    }

                    // Aisle — empty, same size as a seat
                    if (seat.isAisle || seat.status === 'aisle') {
                      return <div key={seat.id} className={cellClass} />;
                    }

                    const isSelected = selectedSeats.includes(seat.id);
                    let cls = `${cellClass} rounded-t-lg rounded-b-sm transition-all duration-200 cursor-pointer flex items-center justify-center text-[10px] font-bold border outline-none`;

                    if (seat.status === 'reserved') {
                      cls += ' bg-white/5 border-white/5 text-white/10 cursor-not-allowed';
                    } else if (isSelected) {
                      cls += ' bg-primary border-primary text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-110 z-10';
                    } else if (seat.tier === 'premium') {
                      cls += ' border-secondary/50 text-secondary/70 hover:bg-secondary/20 hover:border-secondary';
                    } else {
                      cls += ' border-white/20 text-white/40 hover:bg-white/10 hover:border-white/50';
                    }

                    return (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'reserved'}
                        className={cls}
                        title={`${seat.id} - ₹${seat.price}`}
                      >
                        {isSelected ? seat.number : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Right label */}
                <span className="w-5 text-xs text-white/40 font-bold flex-shrink-0 text-left select-none">
                  {rowObj.row}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 bg-surface/50 px-10 py-5 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-white/20 rounded-t-md rounded-b-sm" />
            <span className="text-xs font-medium text-white/70">Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-secondary/50 shadow-[0_0_8px_rgba(139,92,246,0.2)] rounded-t-md rounded-b-sm" />
            <span className="text-xs font-medium text-white/70">Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary border border-primary shadow-[0_0_12px_rgba(244,63,94,0.4)] rounded-t-md rounded-b-sm" />
            <span className="text-xs font-medium text-white">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white/5 border border-white/5 rounded-t-md rounded-b-sm" />
            <span className="text-xs font-medium text-white/40">Occupied</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SeatGrid;
