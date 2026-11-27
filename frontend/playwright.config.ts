import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:240000,workers:1,use:{headless:true,actionTimeout:30000},reporter:[['list'],['json',{outputFile:'../docs/results/browser-tests.json'}]]});
