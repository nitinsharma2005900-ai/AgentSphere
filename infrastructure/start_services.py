import subprocess,signal,time,sys,os
processes=[]
def stop(*args):
    for process in processes:
        if process.poll() is None:process.terminate()
    for process in processes:
        try:process.wait(timeout=12)
        except subprocess.TimeoutExpired:process.kill()
    sys.exit(0)
signal.signal(signal.SIGTERM,stop)
signal.signal(signal.SIGINT,stop)
if '127.0.0.1' in os.environ.get('REDIS_URL','redis://127.0.0.1:6379'):processes.append(subprocess.Popen(['redis-server','--bind','127.0.0.1','--save','','--appendonly','no','--maxmemory','32mb','--maxmemory-policy','noeviction']))
processes.append(subprocess.Popen(['python','-m','uvicorn','ai_service.main:app','--host','127.0.0.1','--port','8000']))
processes.append(subprocess.Popen(['node','backend/dist/index.js']))
while True:
    if any(p.poll() is not None for p in processes):stop()
    time.sleep(1)
