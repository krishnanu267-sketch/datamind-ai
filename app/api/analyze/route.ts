import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const recordSchema = z.record(z.string(), z.any());
const schema = z.object({
  profile: recordSchema,
  sample: z.array(recordSchema).max(12),
  question: z.string().max(1200).optional(),
});

const responseSchema = z.object({
  summary: z.string().default(''),
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        demo: true,
        summary: 'Your dataset was profiled successfully, but live AI analysis is not configured for this deployment.',
        answer: 'Live AI analysis is not configured for this deployment.',
        insights: [
          `The dataset contains ${body.profile.rows ?? 'multiple'} rows and ${body.profile.columns ?? 'multiple'} columns.`,
          'Review missing values and duplicate rows before modeling.',
          'Use the dashboard to identify trends and outliers.',
        ],
        recommendations: [
          'Check data types and categorical consistency.',
          'Investigate columns with substantial missing values.',
        ],
      });
    }

    const prompt = `You are DataMind AI, an expert data analyst. Analyze the supplied dataset profile and sample. Return concise, grounded business insights. Never invent numbers. Respond ONLY as valid JSON with exactly these keys: summary (string), insights (string[]), recommendations (string[]), questions (string[]). Make summary a useful 2-4 sentence executive overview. Profile: ${JSON.stringify(body.profile)} Sample: ${JSON.stringify(body.sample)} User question: ${body.question || 'Give the most useful analysis.'}`;

    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-5-mini'),
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = {
        summary: result.text,
        insights: [],
        recommendations: [],
        questions: [],
      };
    }

    const normalized = responseSchema.parse(parsed);
    const fallbackSummary = normalized.summary || normalized.insights[0] || 'Data analysis completed successfully.';

    return NextResponse.json({
      ...normalized,
      summary: fallbackSummary,
      answer: fallbackSummary,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Analysis failed' },
      { status: 400 },
    );
  }
}
