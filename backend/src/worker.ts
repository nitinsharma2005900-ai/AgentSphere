import { db } from './db/store';
import { startWorker,stopJobs } from './services/jobs';
import { ExecutionEngine } from './services/executionEngine';
async function main(){await db.ready;await ExecutionEngine.recoverInterrupted();await startWorker();console.log(JSON.stringify({event:'worker_started'}));}
void main().catch(()=>{console.error('Worker initialization failed');process.exit(1);});
async function stop(){await stopJobs();await db.close();process.exit(0);}
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
