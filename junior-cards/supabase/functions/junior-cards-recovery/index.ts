import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {recoverAccess} from './handler.ts';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const db=createClient(Deno.env.get('SUPABASE_URL')!,keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve((req:Request)=>recoverAccess(req,db));
