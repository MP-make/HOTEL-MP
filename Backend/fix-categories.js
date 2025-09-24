const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixCategories() {
  console.log("🔧 INICIANDO LIMPIEZA FINAL DE CATEGORÍAS...");
  
  try {
    // 1. Mostrar categorías actuales después de la primera limpieza
    console.log("\n📋 CATEGORÍAS ACTUALES:");
    const current = await pool.query("SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria");
    current.rows.forEach(cat => {
      console.log(`   ${cat.id_categoria}. ${cat.nombre}`);
    });

    // 2. Agregar categoría "Estándar" si no existe (sin descripción)
    const estandarCheck = await pool.query("SELECT * FROM public.categorias_habitaciones WHERE LOWER(nombre) = 'estándar' OR LOWER(nombre) = 'estandar'");
    if (estandarCheck.rows.length === 0) {
      await pool.query("INSERT INTO public.categorias_habitaciones (nombre) VALUES ('Estándar')");
      console.log("   ✅ Agregada categoría 'Estándar'");
    } else {
      console.log("   ℹ️ Categoría 'Estándar' ya existe");
    }

    // 3. Reorganizar IDs para que sean secuenciales (opcional pero recomendado)
    console.log("\n🔄 REORGANIZANDO CATEGORÍAS...");
    
    // Crear mapeo de categorías estándar
    const categoriasEstandar = [
      'individual',
      'doble', 
      'familiar',
      'Matrimonial',
      'Simple'
    ];

    // Verificar que todas las categorías básicas existen
    for (const categoria of categoriasEstandar) {
      const exists = await pool.query("SELECT * FROM public.categorias_habitaciones WHERE LOWER(nombre) = LOWER($1)", [categoria]);
      if (exists.rows.length === 0) {
        await pool.query("INSERT INTO public.categorias_habitaciones (nombre) VALUES ($1)", [categoria]);
        console.log(`   ✅ Agregada categoría faltante: '${categoria}'`);
      }
    }

    // 4. Mostrar categorías finales
    console.log("\n📋 CATEGORÍAS FINALES:");
    const final = await pool.query("SELECT * FROM public.categorias_habitaciones ORDER BY id_categoria");
    final.rows.forEach(cat => {
      console.log(`   ${cat.id_categoria}. ${cat.nombre}`);
    });

    console.log("\n✅ LIMPIEZA DE CATEGORÍAS COMPLETADA");
    console.log("🏨 Ahora puedes crear habitaciones seleccionando cualquiera de estas categorías");
    
  } catch (err) {
    console.error("❌ ERROR:", err);
  } finally {
    await pool.end();
  }
}

fixCategories();