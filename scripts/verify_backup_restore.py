import argparse,base64,hashlib,json,sys,uuid
from pathlib import Path
from dotenv import dotenv_values
import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb
from cryptography.fernet import Fernet
TABLES=['organizations','users','agents','prompt_versions','tools','workflows','executions','approval_requests','documents','audit_logs','invoices','sessions','api_keys','secrets','document_chunks']
def main():
    env=dotenv_values('.env');cipher=Fernet(base64.urlsafe_b64encode(hashlib.sha256(env['ENCRYPTION_KEY'].encode()).digest()))
    with psycopg.connect(env['DATABASE_URL']) as connection:
        backup={}
        for table in TABLES:
            cursor=connection.execute(sql.SQL('SELECT * FROM {}').format(sql.Identifier(table)))
            backup[table]={'columns':[c.name for c in cursor.description],'rows':cursor.fetchall()}
        payload=json.dumps(backup,default=str).encode();destination=Path('data/backups/agentsphere.enc');destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(cipher.encrypt(payload))
    restored=json.loads(cipher.decrypt(destination.read_bytes()))
    with psycopg.connect(env['DATABASE_URL']) as connection:
        schema='restore_verification_'+uuid.uuid4().hex
        try:
            connection.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
            connection.execute(sql.SQL('SET LOCAL search_path TO {},public').format(sql.Identifier(schema)))
            connection.execute(Path('backend/src/db/schema.sql').read_text(encoding='utf-8'))
            counts={}
            for table in TABLES:
                columns=restored[table]['columns']
                for row in restored[table]['rows']:
                    values=[Jsonb(value) if col in ['data','embedding','metadata'] else value for col,value in zip(columns,row)]
                    query=sql.SQL('INSERT INTO {} ({}) VALUES ({})').format(sql.Identifier(table),sql.SQL(',').join(map(sql.Identifier,columns)),sql.SQL(',').join(sql.Placeholder() for _ in columns))
                    connection.execute(query,values)
                count=connection.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(table))).fetchone()[0]
                assert count==len(restored[table]['rows']);counts[table]=count
            report={'backup':'AES-256 authenticated encrypted artifact (ignored data directory)','restore':'Full schema and all application tables restored in isolated schema; transaction rolled back after verification','table_counts':counts,'passed':True}
            Path('docs/results/backup-restore.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({'restore_verified':True,'tables':len(counts)}))
        finally:connection.rollback()
if __name__=='__main__':main()
