"use client";
import { useId, useState } from 'react';
export type ElectricalSample = {
    at: number;
    voltage: number | null;
    current: number | null;
    power: number | null;
};
const number = (v: number) => new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 }).format(v);
function PowerGlyph() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3v13M9 7a12 12 0 1 0 14 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>; }
export function PowerSwitch({ on, onChange, disabled = false, label = 'Room power' }: {
    on: boolean;
    onChange: (on: boolean) => void;
    disabled?: boolean;
    label?: string;
}) {
    return <div className="instrument-switch-wrap"><button type="button" role="switch" aria-label={label} aria-checked={on} disabled={disabled} className={'instrument-switch ' + (on ? 'is-on' : 'is-off')} onClick={() => onChange(!on)}><span className="switch-glyph"><PowerGlyph /></span><span className="switch-state">{on ? 'ON' : 'OFF'}</span><span className="switch-thumb"/></button></div>;
}
export function RelayDial({ on, pending = false }: {
    on: boolean | null;
    pending?: boolean;
}) { return <div className={'relay-dial ' + (pending ? 'is-pending' : on === true ? 'is-on' : on === false ? 'is-off' : 'is-unknown')}><span className="relay-orbit"><PowerGlyph /></span><strong>{pending ? 'Pending' : on === true ? 'ON' : on === false ? 'OFF' : 'Unconfirmed'}</strong></div>; }
export function SupplyFlow({ supply, relay, power }: {
    supply: string;
    relay: boolean | null;
    power: number | null;
}) {
    const flowing = supply === 'present' && power !== null && power !== 0;
    return <section className={'supply-flow card ' + (flowing ? 'is-flowing ' : '') + (power !== null && power < 0 ? 'is-exporting' : '')} aria-label="Electricity path"><div className="flow-node"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 3 9 23h11l-4 14 16-22H21Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/></svg><strong>Grid</strong><span>{supply === 'present' ? 'Available' : supply === 'absent' ? 'No supply' : 'Unknown'}</span></div><span className="flow-wire" aria-hidden="true"/><div className="flow-node"><span className={'flow-power ' + (relay === true ? 'is-on' : '')}><PowerGlyph /></span><strong>SmartClamp</strong><span>{relay === true ? 'Relay on' : relay === false ? 'Relay off' : 'Relay unconfirmed'}</span></div><span className="flow-wire" aria-hidden="true"/><div className="flow-node"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m4 19 16-14 16 14M9 16v19h22V16M16 35V24h8v11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/></svg><strong>Your space</strong><span>{power === null ? 'Unknown' : power !== 0 ? number(Math.abs(power)) + ' W' + (power < 0 ? ' exporting' : '') : 'No measured load'}</span></div></section>;
}
export function ElectricalGauge({ label, value, unit, scale, status = 'recorded' }: {
    label: string;
    value: number | null;
    unit: string;
    scale: number;
    status?: string;
}) {
    const safe = value !== null && Number.isFinite(value) ? value : null, max = Math.max(scale, safe === null ? 0 : Math.ceil(Math.abs(safe) * 1.2)), ratio = safe === null ? 0 : Math.max(0, Math.min(1, Math.abs(safe) / max)), angle = -135 + ratio * 270;
    return <section className={'card electrical-gauge ' + (status === 'low' || status === 'high' ? 'has-warning' : '')} aria-label={label + ' instrument'}><div className="instrument-heading"><h2>{label}</h2><span className="instrument-unit">{unit}</span></div><div className="gauge-face" role="img" aria-label={label + ': ' + (safe === null ? 'unavailable' : number(safe) + ' ' + unit)}><svg viewBox="0 0 240 190" aria-hidden="true"><path className="gauge-track" d="M59.9 165.1 A85 85 0 1 1 180.1 165.1" pathLength="100"/><path className="gauge-fill" d="M59.9 165.1 A85 85 0 1 1 180.1 165.1" pathLength="100" strokeDasharray={`${ratio * 100} 100`}/>{safe !== null && <g className="gauge-needle" style={{ transform: `rotate(${angle}deg)` }}><path d="M120 105V38"/><circle cx="120" cy="105" r="5"/></g>}<text x="33" y="181">0</text><text x="190" y="181">{number(max)}</text></svg><div className="gauge-value"><strong>{safe === null ? '—' : number(safe)}</strong><span>{unit}</span></div></div><div className="instrument-status"><span className={'instrument-dot ' + (safe === null || status === 'stale' || status === 'Unverified reading' ? 'is-muted' : '')}/>{safe === null ? 'No reading' : safe < 0 && unit === 'W' ? 'Exporting' : status === 'fresh' ? 'Current reading' : status === 'low' ? 'Low voltage' : status === 'high' ? 'High voltage' : status === 'stale' ? 'Last recorded' : status}</div></section>;
}
export function ElectricalTrends({ samples, demo = false }: {
    samples: ElectricalSample[];
    demo?: boolean;
}) {
    const [window, setWindow] = useState(0);
    const ranges = demo ? [[60, '1m'], [300, '5m'], [0, 'All']] : [[3600, '1h'], [21600, '6h'], [0, 'All']];
    const sorted = samples.filter(s => Number.isFinite(s.at)).slice().sort((a, b) => a.at - b.at);
    const last = sorted.at(-1)?.at ?? 0;
    const points = sorted.filter(p => !window || p.at >= last - window * 1000);
    return <section className="electrical-trends" aria-label="Electrical trends"><div className="trend-toolbar"><h2>Electrical trends</h2><div className="trend-ranges" aria-label="Chart period">{ranges.map(([value, label]) => <button key={value} className={window === value ? 'selected' : ''} aria-pressed={window === value} onClick={() => setWindow(value as number)}>{label}</button>)}</div></div><div className="instrument-grid">{([{ key: 'voltage', label: 'Voltage', unit: 'V' }, { key: 'current', label: 'Current', unit: 'A' }, { key: 'power', label: 'Power', unit: 'W' }] as const).map(metric => <Trace key={metric.key} points={points} metric={metric.key} label={metric.label} unit={metric.unit}/>)}</div></section>;
}
function Trace({ points, metric, label, unit }: {
    points: ElectricalSample[];
    metric: 'voltage' | 'current' | 'power';
    label: string;
    unit: string;
}) {
    const id = useId().replace(/:/g, '');
    const values = points.map(p => p[metric]).filter((v): v is number => v !== null && Number.isFinite(v)), min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1, pad = Math.max((max - min) * .15, Math.abs(max) * .02, .1), lo = min < 0 ? min - pad : Math.max(0, min - pad), hi = max + pad, start = points[0]?.at ?? 0, end = points.at(-1)?.at ?? start + 1;
    const gaps = points.slice(1).map((p, i) => p.at - points[i].at).filter(v => v > 0).sort((a, b) => a - b), gap = Math.max(180000, (gaps[Math.floor(gaps.length / 2)] ?? 0) * 2.5);
    let open = false, previous = 0;
    let d = '';
    const mapped = points.map(p => { const value = p[metric]; if (value === null || !Number.isFinite(value)) {
        open = false;
        return null;
    } const x = 20 + (p.at - start) / Math.max(1, end - start) * 320, y = 125 - (value - lo) / Math.max(.1, hi - lo) * 95; if (p.at - previous > gap)
        open = false; d += `${open ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `; open = true; previous = p.at; return { x, y, value, at: p.at }; });
    const when = (at: number) => new Date(at).toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', second: points.length && end - start < 300000 ? '2-digit' : undefined });
    return <article className="card trace-card"><div className="instrument-heading"><h3>{label}</h3><span>{unit}</span></div>{values.length ? <><svg viewBox="0 0 360 165" role="img" aria-label={`${label} trend, ${values.length} recorded values. Exact readings below.`}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#234b3d" stopOpacity=".15"/><stop offset="1" stopColor="#234b3d" stopOpacity="0"/></linearGradient></defs>{[30, 77, 125].map(y => <line key={y} x1="20" x2="340" y1={y} y2={y} className="trace-grid"/>)}<path d={d} className="trace-line"/>{mapped.filter(Boolean).map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r={points.length > 50 ? 1.5 : 2.6} className="trace-dot"><title>{when(p.at)} · {number(p.value)} {unit}</title></circle>)}<text x="20" y="153">{when(start)}</text><text x="340" y="153" textAnchor="end">{when(end)}</text></svg><div className="trace-summary"><span>Min <strong>{number(min)}</strong></span><span>Peak <strong>{number(max)} {unit}</strong></span></div><details className="instrument-data"><summary>Exact readings</summary><div className="table-wrap"><table><thead><tr><th>Time (Lagos)</th><th>{unit}</th></tr></thead><tbody>{points.map((p, i) => <tr key={i}><td>{when(p.at)}</td><td>{p[metric] === null ? 'Unavailable' : number(p[metric]!)}</td></tr>)}</tbody></table></div></details></> : <div className="trace-empty"><svg viewBox="0 0 180 70" aria-hidden="true"><path d="M5 50h45m20 0h35m20 0h45"/></svg><p>Waiting for measured readings</p></div>}</article>;
}
export function RoomLoadComparison({ rooms }: {
    rooms: {
        id: string;
        label: string;
        monitoring?: {
            power_w: number | null;
            recorded_today_kwh: number | null;
            fresh: boolean;
        };
    }[];
}) {
    const [metric, setMetric] = useState<'power' | 'energy'>('power');
    const values = rooms.map(r => { const n = metric === 'power' ? r.monitoring?.power_w : r.monitoring?.recorded_today_kwh; return typeof n === 'number' && Number.isFinite(n) && (metric !== 'power' || r.monitoring?.fresh) ? n : null; });
    const max = Math.max(1, ...values.filter((v): v is number => v !== null).map(Math.abs));
    return <section className="room-comparison" aria-label="Room energy comparison"><div className="trend-toolbar"><h3>Room comparison</h3><div className="trend-ranges"><button type="button" className={metric === 'power' ? 'selected' : ''} aria-pressed={metric === 'power'} onClick={() => setMetric('power')}>Power now</button><button type="button" className={metric === 'energy' ? 'selected' : ''} aria-pressed={metric === 'energy'} onClick={() => setMetric('energy')}>Recorded today</button></div></div>{rooms.length ? <div className="room-load-list" role="list">{rooms.map((room, i) => <div className="room-load-row" role="listitem" key={room.id}><div className="room-load-label"><strong>{room.label}</strong><span>{values[i] === null ? 'No current reading' : number(values[i]!) + (metric === 'power' ? ' W' : ' kWh')}</span></div><div className={'room-load-track ' + (values[i] === null ? 'is-missing' : '')} role="img" aria-label={room.label + ': ' + (values[i] === null ? 'unavailable' : number(values[i]!) + (metric === 'power' ? ' watts' : ' kilowatt hours'))}>{values[i] !== null && <span style={{ width: `${Math.abs(values[i]!) / max * 100}%` }}/>}</div></div>)}</div> : <div className="trace-empty"><p>Link room devices to see their measurements.</p></div>}<details className="instrument-help"><summary>About this comparison</summary><p>Bars compare measured rooms, not circuit limits. Recorded daily energy covers received intervals in Lagos time; missing data is not zero.</p></details></section>;
}
