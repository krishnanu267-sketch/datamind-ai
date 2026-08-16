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

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        demo: true,
        answer: 'Demo mode is active. Add OPENAI_API_KEY in Vercel to enable live AI analysis.',
        insights: [
          'Your dataset has been profiled successfully.',
          'Review missing values and duplicate rows before modeling.',
          'Use the dashboard to identify trends and outliers.',
        ],
      });
    }

    const prompt = `You are DataMind AI, an expert data analyst. Analyze the supplied dataset profile and sample. Return concise, grounded business insights. Never invent numbers. Respond with JSON containing summary (string), insights (string[]), recommendations (string[]), questions (string[]). Profile: ${JSON.stringify(body.profile)} Sample: ${JSON.stringify(body.sample)} User question: ${body.question || 'Give the most useful analysis.'}`;
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-5-mini'),
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = { summary: result.text, insights: [], recommendations: [], questions: [] };
    }

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Analysis failed' },
      { status: 400 },
    );
  }
}
