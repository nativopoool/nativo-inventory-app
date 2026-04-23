// Seed dynamic form directly into Supabase (READ + INSERT only)
import pg from 'pg';
const { Client } = pg;

const DB_URL = 'postgresql://postgres.ftbuzabtivheudxacxhv:gA6iC3jVlAHutnf0@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=no-verify';

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    console.log('✅ Conectado a Supabase');

    // Step 1: Check table structure
    const cols = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'dynamic_form_schema' ORDER BY ordinal_position
    `);
    console.log('📋 Columnas de dynamic_form_schema:');
    cols.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

    // Step 2: Check existing records
    const existing = await client.query('SELECT id, code, target FROM dynamic_form_schema');
    console.log(`\n📊 Formularios existentes: ${existing.rowCount}`);
    existing.rows.forEach(r => console.log(`   - [${r.id}] ${r.code} → ${r.target}`));

    // Step 3: Insert if not exists
    const code = 'INGRESO_MERCANCIA';
    const alreadyExists = existing.rows.find(r => r.code === code);

    if (alreadyExists) {
        console.log(`\n⚠️ El formulario "${code}" ya existe (ID: ${alreadyExists.id}). No se inserta.`);
    } else {
        const schema = {
            title: "Ingreso de Mercancía",
            fields: [
                { name: "supplier", type: "text", label: "Proveedor", placeholder: "Nombre del proveedor..." },
                { name: "purchasePrice", type: "number", label: "Costo de Compra (con IVA)", placeholder: "Valor total pagado..." },
                { name: "stockLocationId", type: "select", label: "Bodega de Destino", options: [{ label: "Bodega Central", value: "1" }, { label: "Exhibición", value: "2" }] },
                { name: "isReplacement", type: "select", label: "¿Es Reposición?", options: [{ label: "Sí", value: "yes" }, { label: "No (Nuevo Item)", value: "no" }] },
                { name: "damageObs", type: "text", label: "Observaciones de Daño", visibility: { field: "isReplacement", equals: "no" } }
            ]
        };

        const result = await client.query(
            `INSERT INTO dynamic_form_schema ("createdAt", "updatedAt", code, target, schema) 
             VALUES (NOW(), NOW(), $1, $2, $3) RETURNING id, code`,
            [code, 'PRODUCT_VARIANT', JSON.stringify(schema)]
        );
        console.log(`\n✅ Formulario creado exitosamente:`, result.rows[0]);
    }

    await client.end();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
