import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], darkMode:'class', theme:{extend:{colors:{ink:'#0b1020',accent:'#7c3aed',cyan:'#06b6d4'}}}, plugins:[] };
export default config;
