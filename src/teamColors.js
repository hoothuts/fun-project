const TEAM_COLORS = {
  mercedes: '#27f4d2',
  ferrari: '#e8002d',
  mclaren: '#ff8000',
  red_bull: '#3671c6',
  rb: '#6692ff',
  alpine: '#ff87bc',
  haas: '#b6babd',
  audi: '#8c1d40',
  williams: '#64c4ff',
  aston_martin: '#229971',
  cadillac: '#c8ccd2',
};

export const teamColor = (id) => TEAM_COLORS[id] ?? '#9ba0a6';