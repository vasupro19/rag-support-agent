import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we should fallback to our local PostgreSQL database
const useLocalPostgres = !supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes('placeholder');

let localPool: Pool | null = null;
if (useLocalPostgres) {
  console.log('🔌 Connecting to local PostgreSQL database "rag_support"...');
  localPool = new Pool({
    user: 'apple',
    host: 'localhost',
    database: 'rag_support',
    password: '',
    port: 5432,
  });
}

// 1. Initialize real Supabase client
const realSupabase = useLocalPostgres
  ? null
  : createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        persistSession: false,
      },
    });

// 2. Mock client implementation for local PostgreSQL
const localSupabaseMock = {
  // Cosine similarity search (RPC) wrapper
  async rpc(name: string, args: any) {
    if (name === 'match_policies' && localPool) {
      try {
        const query = `
          SELECT id, content, 1 - (embedding <=> $1::vector) as similarity
          FROM company_policies
          WHERE 1 - (embedding <=> $1::vector) > $2
          ORDER BY embedding <=> $1::vector ASC
          LIMIT $3;
        `;
        // Format array [0.1, 0.2, ...] to pgvector format '[0.1,0.2,...]'
        const vectorStr = `[${args.query_embedding.join(',')}]`;
        const res = await localPool.query(query, [vectorStr, args.match_threshold, args.match_count]);
        return { data: res.rows, error: null };
      } catch (err: any) {
        console.error('Local PG RPC match_policies error:', err);
        return { data: null, error: err };
      }
    }
    return { data: null, error: new Error(`RPC function ${name} not implemented locally.`) };
  },

  // Table query builder wrapper (mimicking Supabase's PostgREST)
  from(table: string) {
    return {
      select(columns: string = '*') {
        const queryState = {
          table,
          columns,
          eqField: null as string | null,
          eqVal: null as any,
          orderField: null as string | null,
          orderAsc: true,
          isSingle: false,
        };

        const chain = {
          eq(field: string, val: any) {
            queryState.eqField = field;
            queryState.eqVal = val;
            return chain;
          },
          order(field: string, options?: { ascending?: boolean }) {
            queryState.orderField = field;
            queryState.orderAsc = options?.ascending !== false;
            return chain;
          },
          single() {
            queryState.isSingle = true;
            return chain;
          },
          // Thenable signature conforming to PromiseLike for await
          async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
            if (!localPool) {
              const errResult = { data: null, error: new Error('Local database connection pool is not initialized.') };
              if (onfulfilled) return onfulfilled(errResult);
              return errResult;
            }

            try {
              let sql = `SELECT ${queryState.columns} FROM ${queryState.table}`;
              const params: any[] = [];

              if (queryState.eqField !== null) {
                sql += ` WHERE ${queryState.eqField} = $1`;
                params.push(queryState.eqVal);
              }

              if (queryState.orderField !== null) {
                sql += ` ORDER BY ${queryState.orderField} ${queryState.orderAsc ? 'ASC' : 'DESC'}`;
              }

              const res = await localPool.query(sql, params);

              if (queryState.isSingle) {
                const row = res.rows[0] || null;
                const singleResult = { data: row, error: row ? null : new Error('Row not found.') };
                if (onfulfilled) return onfulfilled(singleResult);
                return singleResult;
              }

              const listResult = { data: res.rows, error: null };
              if (onfulfilled) return onfulfilled(listResult);
              return listResult;
            } catch (err: any) {
              console.error('Local PG select query error:', err);
              const errResult = { data: null, error: err };
              if (onfulfilled) return onfulfilled(errResult);
              return errResult;
            }
          },
        };

        return chain;
      },

      update(values: any) {
        const queryState = {
          table,
          values,
          eqField: null as string | null,
          eqVal: null as any,
        };

        const chain = {
          eq(field: string, val: any) {
            queryState.eqField = field;
            queryState.eqVal = val;
            return chain;
          },
          async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
            if (!localPool) {
              const errResult = { data: null, error: new Error('Local database connection pool is not initialized.') };
              if (onfulfilled) return onfulfilled(errResult);
              return errResult;
            }

            try {
              const keys = Object.keys(queryState.values);
              const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
              let sql = `UPDATE ${queryState.table} SET ${setClause}`;
              const params = keys.map((key) => queryState.values[key]);

              if (queryState.eqField !== null) {
                sql += ` WHERE ${queryState.eqField} = $${params.length + 1}`;
                params.push(queryState.eqVal);
              }

              const res = await localPool.query(sql, params);
              const successResult = { data: res.rows, error: null };
              if (onfulfilled) return onfulfilled(successResult);
              return successResult;
            } catch (err: any) {
              console.error('Local PG update query error:', err);
              const errResult = { data: null, error: err };
              if (onfulfilled) return onfulfilled(errResult);
              return errResult;
            }
          },
        };

        return chain;
      },
    };
  },
};

// Export the client typed as 'any' to prevent typescript compilation issues with the custom mock PostgREST client
export const supabase = (useLocalPostgres ? localSupabaseMock : realSupabase) as any;
