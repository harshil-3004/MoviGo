import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSeat, lockSeats } from '../../store/bookingSlice';
import { getRowPrice, getScreenForShowtime } from '../../utils/bookingUtils';

const SeatGrid = ({ fullShowtime }) => {
  const dispatch = useDispatch();
  const { selectedSeats, status } = useSelector((state) => state.booking);

  const buildFallbackGrid = (rowsCount = 10, colsCount = 12, screen = null) => {
    const theaterLayout = [];
    for (let rIdx = 0; rIdx < rowsCount; rIdx++) {
      const rowLabel = String.fromCharCode(65 + rIdx);
      const rowPrice = getRowPrice(screen, rowLabel);
      const pricingObj = screen?.pricing || {};
      const configuredValues = Object.values(pricingObj).filter((v) => typeof v === 'number');
      const minPrice = configuredValues.length > 0 ? Math.min(...configuredValues) : 350;
      const tier = rowPrice > minPrice ? 'premium' : 'standard';

      const rowSeats = [];
      for (let cIdx = 0; cIdx < colsCount; cIdx++) {
        const seatId = `${rowLabel}${cIdx + 1}`;
        const isReserved =
          fullShowtime?.bookedSeats?.includes(seatId) ||
          fullShowtime?.lockedSeats?.some((ls) => ls.seat === seatId) ||
          false;
        rowSeats.push({
          id: seatId,
          number: cIdx + 1,
          tier,
          price: rowPrice,
          status: isReserved ? 'reserved' : 'available',
          isAisle: false,
        });
      }
      theaterLayout.push({ row: rowLabel, price: rowPrice, tier, seats: rowSeats });
    }
    return theaterLayout;
  };

  let theaterLayout = [];
  const screen = getScreenForShowtime(fullShowtime);

  if (screen && Array.isArray(screen.layout) && screen.layout.length > 0) {
    const pricingObj = screen.pricing || {};
    const configuredValues = Object.values(pricingObj).filter((v) => typeof v === 'number');
    const minPrice = configuredValues.length > 0 ? Math.min(...configuredValues) : 350;

    theaterLayout = screen.layout.map((rowCells, rIdx) => {
      const rowLabel = String.fromCharCode(65 + rIdx);
      const rowPrice = getRowPrice(screen, rowLabel);
      const tier = rowPrice > minPrice ? 'premium' : 'standard';

      return {
        row: rowLabel,
        price: rowPrice,
        tier,
        seats: rowCells.map((cell, cIdx) => {
          const seatId = `${rowLabel}${cIdx + 1}`;
          const isReserved =
            fullShowtime.bookedSeats?.includes(seatId) ||
            fullShowtime.lockedSeats?.some((ls) => ls.seat === seatId) ||
            cell.isReserved;
          return {
            id: seatId,
            number: cIdx + 1,
            tier,
            price: rowPrice,
            isAisle: cell.type === 'aisle',
            status: cell.type === 'aisle' ? 'aisle' : (isReserved ? 'reserved' : 'available'),
          };
        }),
      };
    });
  } else if (screen) {
    theaterLayout = buildFallbackGrid(screen.rows || 10, screen.cols || 12, screen);
  } else {
    theaterLayout = buildFallbackGrid(10, 12, null);
  }

  const maxCols = theaterLayout.length > 0
    ? Math.max(...theaterLayout.map((r) => r.seats.length))
    : 12;

  const handleSeatClick = (seat) => {
    if (seat.status === 'reserved' || seat.status === 'aisle') return;
    if (selectedSeats.length === 0 && status !== 'locked') {
      dispatch(lockSeats(300));
    }
    dispatch(toggleSeat(seat.id));
  };

  const cellClass = 'w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Legend Bar */}
      <div
        className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 mb-8 px-5 py-3 rounded-xl border text-xs font-medium"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
          color: 'var(--mg-ink-2)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-t-md rounded-b-xs border inline-block"
            style={{ borderColor: 'var(--mg-border-strong)', backgroundColor: 'var(--mg-surface-2)' }}
          />
          <span>Standard</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-t-md rounded-b-xs border inline-block"
            style={{ borderColor: 'var(--mg-gold)', backgroundColor: 'var(--mg-gold-soft)' }}
          />
          <span>Premium</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-t-md rounded-b-xs inline-block"
            style={{ backgroundColor: 'var(--mg-accent)' }}
          />
          <span style={{ color: 'var(--mg-ink)' }}>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-t-md rounded-b-xs border inline-block opacity-40"
            style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-3)' }}
          />
          <span>Occupied</span>
        </div>
      </div>

      {/* Scrollable Seat Grid */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-4">
        <div className="min-w-max mx-auto flex flex-col items-center px-4">
          {/* Screen Arc */}
          <div className="w-full max-w-lg mb-10 flex flex-col items-center">
            <svg
              viewBox="0 0 400 26"
              className="w-full h-6"
              aria-hidden="true"
            >
              <path
                d="M 12 22 Q 200 2 388 22"
                fill="none"
                stroke="var(--mg-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.75"
              />
            </svg>
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.25em] mt-1"
              style={{ color: 'var(--mg-ink-3)' }}
            >
              All eyes this way — Screen
            </span>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1.5">
            {theaterLayout.map((rowObj, idx) => {
              const prevPrice = idx > 0 ? theaterLayout[idx - 1].price : null;
              const showTierBand = prevPrice === null || prevPrice !== rowObj.price;
              const paddedSeats = [...rowObj.seats];
              while (paddedSeats.length < maxCols) {
                paddedSeats.push({
                  id: `ghost-${rowObj.row}-${paddedSeats.length}`,
                  isGhost: true,
                });
              }

              return (
                <React.Fragment key={rowObj.row}>
                  {showTierBand && (
                    <div
                      className={`flex items-center justify-between px-8 pb-1 ${idx > 0 ? 'pt-4 mt-1 border-t' : ''}`}
                      style={{ borderColor: 'var(--mg-border)' }}
                    >
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: rowObj.tier === 'premium' ? 'var(--mg-gold)' : 'var(--mg-ink-3)' }}
                      >
                        {rowObj.tier === 'premium' ? 'Premium Tier' : 'Standard Tier'}
                      </span>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: 'var(--mg-ink-2)' }}
                      >
                        ₹{rowObj.price}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 text-xs font-mono font-semibold flex-shrink-0 text-right select-none"
                      style={{ color: 'var(--mg-ink-3)' }}
                    >
                      {rowObj.row}
                    </span>

                    <div
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                    >
                      {paddedSeats.map((seat) => {
                        if (seat.isGhost) {
                          return <div key={seat.id} className={`${cellClass} opacity-0`} />;
                        }
                        if (seat.isAisle || seat.status === 'aisle') {
                          return <div key={seat.id} className={cellClass} />;
                        }

                        const isSelected = selectedSeats.includes(seat.id);
                        const isReserved = seat.status === 'reserved';

                        const seatStyle = isReserved
                          ? {
                              backgroundColor: 'var(--mg-surface-3)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-ink-3)',
                              opacity: 0.35,
                            }
                          : isSelected
                            ? {
                                backgroundColor: 'var(--mg-accent)',
                                borderColor: 'var(--mg-accent)',
                                color: '#ffffff',
                              }
                            : seat.tier === 'premium'
                              ? {
                                  backgroundColor: 'var(--mg-gold-soft)',
                                  borderColor: 'rgba(217, 119, 6, 0.55)',
                                  color: 'var(--mg-gold)',
                                }
                              : {
                                  backgroundColor: 'var(--mg-surface-2)',
                                  borderColor: 'var(--mg-border-strong)',
                                  color: 'var(--mg-ink-2)',
                                };

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            onClick={() => handleSeatClick(seat)}
                            disabled={isReserved}
                            aria-label={`Seat ${seat.id}, ₹${seat.price}, ${
                              isReserved ? 'occupied' : isSelected ? 'selected' : 'available'
                            }`}
                            aria-pressed={isSelected}
                            style={seatStyle}
                            className={`${cellClass} rounded-t-md rounded-b-xs border transition-transform duration-100 flex items-center justify-center text-[10px] font-mono font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isReserved ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                            }`}
                            title={`${seat.id} — ₹${seat.price}`}
                          >
                            {isReserved ? '×' : seat.number}
                          </button>
                        );
                      })}
                    </div>

                    <span
                      className="w-5 text-xs font-mono font-semibold flex-shrink-0 text-left select-none"
                      style={{ color: 'var(--mg-ink-3)' }}
                    >
                      {rowObj.row}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatGrid;
