import os
import tempfile
# Unit/API tests use an explicitly enabled development adapter, never live credentials.
os.environ['ALLOW_MOCK_PROVIDER']='true'
os.environ['AI_PROVIDER']='mock'
os.environ['GEMINI_API_KEY']=''
os.environ['SERVICE_SECRET']='test-only-service-key-not-for-production'
os.environ['DATABASE_URL']=''
os.environ['VECTOR_STORE_PATH']=tempfile.mktemp(prefix='agentsphere-test-',suffix='.sqlite3')
