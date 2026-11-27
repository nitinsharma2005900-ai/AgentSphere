import {db} from './db/store';
void db.ready.then(()=>db.close()).then(()=>console.log('Migrations applied successfully')).catch(()=>{console.error('Migration failed');process.exitCode=1;});
