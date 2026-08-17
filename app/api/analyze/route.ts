import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Mistral } from '@mistralai/mistralai';

const recordSchema = z.record(z.string(), z.any());
const schema = z.object({ profile: recordSchema, sample: z.array(recordSchema).max(12), question: z.string().max(1200).optional() });
const responseSchema = z.object({ summary: z.string().default(''), insights: z.array(z.string()).default([]), recommendations: z.array(z.string()).default([]), questions: z.array(z.string()).default([]) });

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : part && typeof part === 'object' && 'text' in part ? String((part as { text: unknown }).text) : '').join('');
  return '';
}

function cleanJsonText(text: string): string {
  let value = text.trim();
  value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  return start >= 0 && end > start ? value.slice(start, end + 1) : value;
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) return NextResponse.json({ demo: true, summary: `Your dataset contains ${body.profile.rows ?? 'multiple'} rows and ${body.profile.columns ?? 'multiple'} columns.`, insights: ['Review missing values and duplicate rows before modeling.', 'Use the charts to identify trends and outliers.'], recommendations: ['Check data types and categorical consistency.', 'Investigate columns with substantial missing values.'], questions: ['Which metric is highest?', 'Which categories perform best?'] });

    const client = new Mistral({ apiKey });
    const prompt = `You are DataMind AI, an expert data analyst. Analyze the supplied dataset profile and sample. Never invent numbers. Return ONLY valid JSON with exactly these keys: summary (string), insights (string[]), recommendations (string[]), questions (string[]). Do not use Markdown fences. Make summary a useful 2-4 sentence executive overview. Profile: ${JSON.stringify(body.profile)} Sample: ${JSON.stringify(body.sample)} User question: ${body.question || 'Give the most useful analysis.'}`;
    const result = await client.chat.complete({ model: process.env.MISTRAL_MODEL || 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.2 });
    const rawText = extractText(result.choices?.[0]?.message?.content);
    let parsed: unknown;
    try { parsed = JSON.parse(cleanJsonText(rawText)); }
    catch { parsed = { summary: rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''), insights: [], recommendations: [], questions: [] }; }
    const normalized = responseSchema.parse(parsed);
    return NextResponse.json({ ...normalized, summary: normalized.summary || 'Analysis completed successfully.', answer: normalized.summary, build: 'stable-analytics-v1' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    console.error('DataMind AI analysis error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
