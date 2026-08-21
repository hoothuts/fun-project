import { useMemo } from 'react';

const F1_ERAS = [
  {
    id: 'ground-effect',
    name: 'GROUND EFFECT',
    years: ['current', '2025', '2024', '2023', '2022'],
  },
  {
    id: 'turbo-hybrid',
    name: 'TURBO-HYBRID',
    years: ['2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014'],
  },
  {
    id: 'v8',
    name: 'V8 ERA',
    years: ['2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006'],
  },
  {
    id: 'v10',
    name: 'V10 ERA',
    years: ['2005', '2004', '2003', '2002', '2001', '2000', '1998', '1995'],
  },
  {
    id: 'classic',
    name: 'CLASSIC',
    years: ['1994', '1991', '1988', '1984', '1980', '1976', '1970', '1960', '1950'],
  },
];

export default function EraSeasonSelector({ season, onSelectSeason }) {
  const activeEraId = useMemo(() => {
    const found = F1_ERAS.find((e) => e.years.includes(season));
    return found ? found.id : 'ground-effect';
  }, [season]);

  const currentEraObj = F1_ERAS.find((e) => e.id === activeEraId) || F1_ERAS[0];

  return (
    <div className="era-selector-container">
      <div className="era-tabs" role="tablist" aria-label="Formula 1 Eras">
        {F1_ERAS.map((era) => (
          <button
            key={era.id}
            type="button"
            role="tab"
            aria-selected={activeEraId === era.id}
            className={`era-tab ${activeEraId === era.id ? 'is-active' : ''}`}
            onClick={() => onSelectSeason(era.years[0])}
          >
            {era.name}
          </button>
        ))}
      </div>
      <div className="season-picker" aria-label="Seasons">
        {currentEraObj.years.map((s) => (
          <button
            key={s}
            type="button"
            className={`season-pill ${season === s ? 'active' : ''}`}
            onClick={() => onSelectSeason(s)}
          >
            {s === 'current' ? 'CURRENT' : s}
          </button>
        ))}
      </div>
    </div>
  );
}
