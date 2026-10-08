"""Reproducible SQLite query benchmark. Not a Cloudflare/network load test."""
import argparse,sqlite3,pathlib,json,time,statistics,datetime
ap=argparse.ArgumentParser();ap.add_argument('--users',type=int,default=50000);ap.add_argument('--pools',type=int,default=30000);ap.add_argument('--records',type=int,default=600000);args=ap.parse_args()
out=pathlib.Path('.test-artifacts');out.mkdir(exist_ok=True);db=out/'capacity.sqlite'
if db.exists():db.unlink()
c=sqlite3.connect(db);c.executescript(pathlib.Path('schema/0001_platform.sql').read_text());t=time.perf_counter()
c.executemany('INSERT INTO users(id,username,name,password_hash,recovery_hash,is_pro) VALUES(?,?,?,?,?,?)',((f'u{i}',f'fixture{i}',f'Fixture {i}','fixture-not-a-password','fixture',int(i<500)) for i in range(args.users)))
c.executemany('INSERT INTO pools(id,name,created_by) VALUES(?,?,?)',((f'p{i:07d}',f'Pool fixture {i}',f'u{500+i%(args.users-500)}') for i in range(args.pools)))
c.executemany('INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES(?,?,?,?,?)',((f'o{i}',f'p{i:07d}',f'u{500+i%(args.users-500)}','owner',1) for i in range(args.pools)))
c.executemany('INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES(?,?,?,?,?)',((f'm{i}',f'p{i:07d}',f'u{i%500}','principal',0) for i in range(args.pools)))
c.executemany('INSERT INTO schedules(id,pool_id,pro_id,start_date) VALUES(?,?,?,?)',((f's{i}',f'p{i:07d}',f'u{i%500}','2025-01-01') for i in range(args.pools)))
base=datetime.datetime(2025,1,1);dates=[(base+datetime.timedelta(days=i)).isoformat()+'Z' for i in range(630)]
c.executemany('INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,readings,published_at) VALUES(?,?,?,?,?,?,?,?)',((f'r{i:09d}',f'p{i%args.pools:07d}',f'u{i%500}','Fixture professional','visit',dates[(i//args.pools)*7%630],'{"ph":7.2,"chlorine":1.4,"tac":95}',dates[(i//args.pools)*7%630]) for i in range(args.records)))
c.commit();c.execute('ANALYZE');build=time.perf_counter()-t
queries={
 'authorization':("SELECT p.id,m.kind FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=? AND m.user_id=? AND m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>?) AND p.archived_at IS NULL",('p0000500','u0','2026-10-08')),
 'professional_pool_page':("SELECT p.id,p.name,(SELECT max(r.measured_at) FROM records r WHERE r.pool_id=p.id AND r.published_at IS NOT NULL) last_reading FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE m.user_id=? AND m.revoked_at IS NULL AND m.kind IN('principal','temporary') AND p.archived_at IS NULL ORDER BY p.id LIMIT 26",('u0',)),
 'history_page':("SELECT * FROM records WHERE pool_id=? AND published_at IS NOT NULL ORDER BY measured_at DESC,id DESC LIMIT 26",('p0000500',)),
 'timeline_aggregate':("SELECT substr(measured_at,1,10),avg(json_extract(readings,'$.ph')) FROM records WHERE pool_id=? AND published_at IS NOT NULL GROUP BY substr(measured_at,1,10)",('p0000500',)),
 'schedule_page':("SELECT s.* FROM schedules s JOIN pool_members m ON m.pool_id=s.pool_id AND m.user_id=s.pro_id WHERE s.pro_id=? AND s.active=1 AND s.start_date<=? AND m.revoked_at IS NULL LIMIT 1001",('u0','2026-10-08')),
}
result={'scope':'Local SQLite only; excludes network, D1 service limits, authentication CPU, R2 and concurrent users. Not evidence of public hosting capacity.','fixtures':vars(args),'fixture_build_seconds':round(build,2),'database_megabytes':round(db.stat().st_size/1024/1024,1),'queries':{}}
for name,(sql,params) in queries.items():
 samples=[]
 for _ in range(250):
  t=time.perf_counter();rows=c.execute(sql,params).fetchall();samples.append((time.perf_counter()-t)*1000)
 samples.sort();result['queries'][name]={'rows_returned':len(rows),'p50_ms':round(statistics.median(samples),3),'p95_ms':round(samples[int(len(samples)*.95)],3),'p99_ms':round(samples[int(len(samples)*.99)],3),'query_plan':[row[3] for row in c.execute('EXPLAIN QUERY PLAN '+sql,params)]}
(out/'capacity-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
