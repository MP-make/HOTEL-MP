const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function simplifyDatabase() {
    const client = await pool.connect();
    try {
        console.log('🔄 Simplificando estructura de la base de datos...\n');

        // 1. Verificar si las tablas existen
        console.log('1. Verificando tablas existentes...');
        const tables = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('habitaciones', 'categorias_habitaciones')
        `);
        
        const existingTables = tables.rows.map(t => t.tablename);
        console.log('Tablas encontradas:', existingTables);

        // 2. Crear tabla categorias_habitaciones si no existe
        if (!existingTables.includes('categorias_habitaciones')) {
            console.log('2. Creando tabla categorias_habitaciones...');
            await client.query(`
                CREATE TABLE categorias_habitaciones (
                    id_categoria SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL UNIQUE,
                    descripcion TEXT,
                    capacidad INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            // Insertar categorías básicas
            await client.query(`
                INSERT INTO categorias_habitaciones (nombre, descripcion, capacidad) VALUES
                ('Matrimonial', 'Habitación con cama matrimonial para pareja', 2),
                ('Simple', 'Habitación individual con cama simple', 1),
                ('Doble', 'Habitación con dos camas individuales', 2),
                ('Familiar', 'Habitación amplia para familia', 4)
                ON CONFLICT (nombre) DO NOTHING;
            `);
            console.log('   ✅ Tabla categorias_habitaciones creada con datos básicos');
        } else {
            console.log('2. Verificando estructura de categorias_habitaciones...');
            const catCols = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'categorias_habitaciones'
            `);
            const catColumns = catCols.rows.map(c => c.column_name);
            
            // Agregar columnas faltantes si es necesario
            if (!catColumns.includes('descripcion')) {
                await client.query('ALTER TABLE categorias_habitaciones ADD COLUMN descripcion TEXT');
                console.log('   ✅ Agregada columna descripcion');
            }
            if (!catColumns.includes('capacidad')) {
                await client.query('ALTER TABLE categorias_habitaciones ADD COLUMN capacidad INTEGER');
                console.log('   ✅ Agregada columna capacidad');
            }
        }

        // 3. Crear nueva tabla habitaciones simplificada
        console.log('3. Creando tabla habitaciones simplificada...');
        await client.query(`
            DROP TABLE IF EXISTS habitaciones_new CASCADE;
            CREATE TABLE habitaciones_new (
                id_habitacion SERIAL PRIMARY KEY,
                numero_habitacion VARCHAR(10) NOT NULL UNIQUE,
                id_categoria INTEGER REFERENCES categorias_habitaciones(id_categoria),
                piso INTEGER,
                precio_por_dia DECIMAL(10,2) NOT NULL,
                precio_por_hora DECIMAL(10,2),
                fotos TEXT[],
                disponible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Migrar datos existentes si la tabla habitaciones existe
        if (existingTables.includes('habitaciones')) {
            console.log('4. Migrando datos existentes...');
            try {
                await client.query(`
                    INSERT INTO habitaciones_new (
                        numero_habitacion, 
                        id_categoria, 
                        piso, 
                        precio_por_dia, 
                        precio_por_hora, 
                        fotos, 
                        disponible
                    )
                    SELECT 
                        COALESCE(numero_habitacion, id_habitacion::text) as numero_habitacion,
                        id_categoria,
                        piso,
                        COALESCE(precio_por_dia, 50.00) as precio_por_dia,
                        precio_por_hora,
                        CASE 
                            WHEN fotos IS NOT NULL THEN fotos
                            ELSE ARRAY[]::TEXT[]
                        END as fotos,
                        COALESCE(disponible, true) as disponible
                    FROM habitaciones
                    ON CONFLICT (numero_habitacion) DO NOTHING;
                `);
                
                const migrated = await client.query('SELECT COUNT(*) FROM habitaciones_new');
                console.log(`   ✅ Migradas ${migrated.rows[0].count} habitaciones`);
            } catch (migrationError) {
                console.log('   ⚠️ Error en migración, creando tabla vacía:', migrationError.message);
            }
        } else {
            console.log('4. No hay tabla habitaciones existente, creando nueva tabla vacía');
        }

        // 5. Reemplazar tabla original
        console.log('5. Reemplazando tabla original...');
        await client.query('DROP TABLE IF EXISTS habitaciones_old CASCADE');
        if (existingTables.includes('habitaciones')) {
            await client.query('ALTER TABLE habitaciones RENAME TO habitaciones_old');
        }
        await client.query('ALTER TABLE habitaciones_new RENAME TO habitaciones');

        // 6. Crear índices
        console.log('6. Creando índices...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_habitaciones_categoria ON habitaciones(id_categoria)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_habitaciones_disponible ON habitaciones(disponible)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_habitaciones_piso ON habitaciones(piso)');

        // 7. Verificar resultado final
        console.log('\n7. Verificando estructura final...');
        const finalHab = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'habitaciones' 
            ORDER BY ordinal_position
        `);
        
        const finalCat = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'categorias_habitaciones' 
            ORDER BY ordinal_position
        `);

        console.log('\n✅ ESTRUCTURA FINAL:');
        console.log('\nHABITACIONES:');
        finalHab.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        
        console.log('\nCATEGORÍAS:');
        finalCat.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        console.log('\n🎉 Base de datos simplificada exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Detalle:', error.detail || 'N/A');
    } finally {
        client.release();
        await pool.end();
    }
}

simplifyDatabase().catch(console.error);