'use client';
import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Upload, BrainCircuit, Sparkles, Database, FileBarChart2, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

type Row = Record<string, unknown>;
type Result = { summary?: string; insights?: string[]; recommendations?: string[]; questions?: string[]; demo?: boolean; answer?: string; error?: string };
type ProfileColumn = { column: string; type: 'numeric' | 'categorical'; missing: number; unique: number; min: number | null; max: number | null; avg: number | null };

function profile(rows: Row[]) {
  const cols = Object.keys(rows[0] || {});
  const columnsList: ProfileColumn[] = cols.map((c) => {
    const vals = rows.map((r) => r[c]);
    const nums = vals.map((v) => typeof v === 'number' ? v : Number(v)).filter((v) => Number.isFinite(v));
    return {
      column: c,
      type: nums.length > Math.max(3, vals.length * 0.7) ? 'numeric' : 'categorical',
      missing: vals.filter((v) => v === null || v === undefined || v === '').length,
      unique: new Set(vals.map(String)).size,
      min: nums.length ? Math.min(...nums) : null,
      max: nums.length ? Math.max(...nums) : null,
      avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
    };
  });
  return { rows: rows.length, columns: cols.length, columnsList, duplicates: rows.length - new Set(rows.map((r) => JSON.stringify(r))).size };
}

function topCategories(rows: Row[], column: string, limit = 8) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = String(r[column] ?? 'Unknown');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name: name.length > 20 ? `${name.slice(0, 20)}…` : name, value }));
}

function numericRows(rows: Row[], column: string, limit = 12) {
  return rows.slice(0, limit).map((r, i) => ({
    name: String(r[Object.keys(r)[0]] ?? i + 1).slice(0, 14),
    value: Number(r[column]) || 0,
  }));
}

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [question, setQuestion] = useState('');
  const p = useMemo(() => profile(rows), [rows]);
  const numeric = p.columnsList.filter((x) => x.type === 'numeric' && x.avg !== null);
  const categorical = p.columnsList.filter((x) => x.type === 'categorical');

  const chart1 = numeric[0] ? numericRows(rows, numeric[0].column) : [];
  const chart2 = categorical[0] ? topCategories(rows, categorical[0].column) : [];
  const chart3 = numeric.length >= 2 ? numericRows(rows, numeric[1].column) : [];

  async function analyze() {
    if (!rows.length) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, sample: rows.slice(0, 12), question }),
      });
      const data = await r.json();
      setResult(r.ok ? data : { error: data.error || 'Analysis failed' });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File) {
    setName(file.name);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (r) => { setRows(r.data); setResult(null); },
    });
  }

  return (
    <main className="min-h-screen grid-bg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 p-2"><BrainCircuit size={22}/></div><span className="text-xl font-bold">DataMind <span className="gradient-text">AI</span></span></div>
        <div className="text-sm text-slate-400">AI analytics workspace</div>
      </nav>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        <div className="max-w-3xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200"><Sparkles size={14}/> Turn raw data into decisions</div><h1 className="text-5xl font-black tracking-tight sm:text-7xl">Your data. <span className="gradient-text">Understood.</span></h1><p className="mt-6 text-lg leading-8 text-slate-400">Upload a CSV and DataMind profiles it, visualizes it, detects quality issues, and turns the evidence into practical insights.</p></div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <div className="glass rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold">Upload dataset</h2><p className="text-sm text-slate-400">CSV files up to your browser limits</p></div><Upload className="text-cyan-300"/></div>
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-950/50 text-center hover:border-violet-400"><Upload size={32} className="mb-3 text-slate-400"/><span className="font-medium">Drop your CSV here</span><span className="mt-1 text-xs text-slate-500">or click to browse</span><input className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}/></label>
            {name && <div className="mt-4 flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-400"/>{name}</div>}
            <button disabled={!rows.length || busy} onClick={analyze} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40">{busy ? <><RefreshCw className="animate-spin" size={18}/>Analyzing…</> : <>Analyze with AI <ArrowRight size={18}/></>}</button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[['Rows',p.rows],['Columns',p.columns],['Duplicates',p.duplicates],['Missing',p.columnsList.reduce((a,c) => a + c.missing, 0)]].map(([k,v]) => <div className="glass rounded-2xl p-4" key={String(k)}><div className="text-xs uppercase tracking-wider text-slate-500">{k}</div><div className="mt-2 text-2xl font-bold">{v}</div></div>)}</div>
          </div>
        </div>

        {rows.length > 0 && <div className="mt-8 space-y-6">
          <div className="glass rounded-3xl p-6"><div className="mb-4 flex items-center gap-2"><FileBarChart2 size={18} className="text-cyan-300"/><h2 className="font-bold">Dataset profile</h2></div>
            <div className="grid gap-6 lg:grid-cols-3">
              {chart1.length > 0 && <div className="h-64"><div className="mb-2 text-sm font-semibold text-slate-300">{numeric[0].column} sample</div><ResponsiveContainer width="100%" height="100%"><BarChart data={chart1}><CartesianGrid strokeDasharray="3 3" stroke="#243047"/><XAxis dataKey="name" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #334155'}}/><Bar dataKey="value" fill="#8b5cf6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>}
              {chart2.length > 0 && <div className="h-64"><div className="mb-2 text-sm font-semibold text-slate-300">Top {categorical[0].column}</div><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart2} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={75} label>{chart2.map((_,i) => <Cell key={i} fill={['#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ef4444','#ec4899','#84cc16','#f97316'][i % 8]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>}
              {chart3.length > 0 && <div className="h-64"><div className="mb-2 text-sm font-semibold text-slate-300">{numeric[1].column} trend sample</div><ResponsiveContainer width="100%" height="100%"><LineChart data={chart3}><CartesianGrid strokeDasharray="3 3" stroke="#243047"/><XAxis dataKey="name" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip contentStyle={{background:'#0f172a',border:'1px solid #334155'}}/><Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}
            </div>
          </div>

          <div className="glass rounded-3xl p-6"><div className="flex items-center gap-3"><Database size={18} className="text-cyan-300"/><h2 className="font-bold">Ask your data</h2></div><div className="mt-4 flex gap-3"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && analyze()} placeholder="e.g. Which region should I investigate first?" className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-violet-400"/><button onClick={analyze} disabled={busy} className="rounded-xl bg-slate-800 px-5 font-semibold hover:bg-slate-700">Ask</button></div></div>

          {result && <div className="grid gap-6 lg:grid-cols-2">
            {result.error ? <div className="glass rounded-3xl border border-red-500/30 p-6 lg:col-span-2"><h2 className="font-bold text-red-300">AI analysis error</h2><p className="mt-3 text-sm leading-6 text-red-100/80">{result.error}</p></div> : <>
              <div className="glass rounded-3xl p-6"><div className="mb-4 flex items-center gap-2 text-violet-300"><Sparkles size={18}/><h2 className="font-bold">AI summary</h2></div><p className="whitespace-pre-wrap leading-7 text-slate-300">{result.summary || result.answer || 'Analysis completed.'}</p>{result.demo && <p className="mt-4 text-xs text-amber-300">Demo mode — add a Mistral API key to enable live analysis.</p>}</div>
              <div className="glass rounded-3xl p-6"><h2 className="font-bold">Key insights</h2><ul className="mt-4 space-y-3">{(result.insights || []).map((x, i) => <li key={i} className="flex gap-3 text-sm leading-6 text-slate-300"><CheckCircle2 size={18} className="mt-1 shrink-0 text-emerald-400"/>{x}</li>)}{p.duplicates > 0 && <li className="flex gap-3 text-sm leading-6 text-slate-300"><AlertTriangle size={18} className="mt-1 shrink-0 text-amber-400"/>There are {p.duplicates} duplicate rows worth reviewing.</li>}</ul></div>
              <div className="glass rounded-3xl p-6"><h2 className="font-bold">Recommendations</h2><ul className="mt-4 space-y-3">{(result.recommendations || []).map((x, i) => <li key={i} className="text-sm leading-6 text-slate-300">• {x}</li>)}</ul></div>
              <div className="glass rounded-3xl p-6"><h2 className="font-bold">Questions to explore</h2><ul className="mt-4 space-y-3">{(result.questions || []).map((x, i) => <li key={i} className="text-sm leading-6 text-slate-300">• {x}</li>)}</ul></div>
            </>}
          </div>}
        </div>}
      </section>
    </main>
  );
}
