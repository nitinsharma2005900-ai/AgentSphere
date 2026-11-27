import subprocess,sys,json
from pathlib import Path
command=[sys.executable,'-m','pytest','ai_service/tests/test_security_regressions.py','ai_service/tests/test_ai_gateway.py','-q','--junitxml=docs/results/safety-tests.xml']
result=subprocess.run(command,capture_output=True,text=True)
print(result.stdout)
report={'command':' '.join(command),'exit_code':result.returncode,'scope':'Python guardrail and pipeline regression checks. Engine limits, quotas, RBAC, and tool execution are covered separately by backend tests. Live model inference is verified separately.','passed':result.returncode==0}
Path('docs/specs/safety_evaluations_report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
sys.exit(result.returncode)
